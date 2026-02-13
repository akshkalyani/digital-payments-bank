const axios = require("axios");
const { BaseRepository } = require("../../../shared/database");
const { PAYMENT_STATUS, PAYMENT_METHOD } = require("../../../shared/utils");

class PaymentService extends BaseRepository {
  constructor(paymentModel) {
    super(paymentModel);
    this.Payment = paymentModel;

    // Service endpoints
    this.customerServiceUrl =
      process.env.CUSTOMER_SERVICE_URL || "http://localhost:8081/api/v1";
    this.merchantServiceUrl =
      process.env.MERCHANT_SERVICE_URL || "http://localhost:8082/api/v1";
    this.qrServiceUrl =
      process.env.QR_SERVICE_URL || "http://localhost:8084/api/v1";
    this.fraudServiceUrl =
      process.env.FRAUD_SERVICE_URL || "http://localhost:8088/api/v1";
    this.bankServiceUrl =
      process.env.BANK_SERVICE_URL || "http://localhost:8085/api/v1";
    this.loyaltyServiceUrl =
      process.env.LOYALTY_SERVICE_URL || "http://localhost:8089/api/v1";
    this.notificationServiceUrl =
      process.env.NOTIFICATION_SERVICE_URL || "http://localhost:8087/api/v1";
    this.transactionServiceUrl =
      process.env.TRANSACTION_SERVICE_URL || "http://localhost:8086/api/v1";
  }

  async initiatePayment(paymentData) {
    // Validate sender exists
    const sender = await this.validateCustomer(paymentData.senderId);
    if (!sender) {
      throw new Error("Sender not found");
    }

    let recipient = null;
    let qrCodeData = null;

    // Handle different payment methods
    if (paymentData.method === PAYMENT_METHOD.QR_CODE) {
      if (paymentData.qrCodeId) {
        qrCodeData = await this.validateQRCode(paymentData.qrCodeId);
        if (!qrCodeData) {
          throw new Error("QR code not found or expired");
        }

        // Override recipient data from QR code
        paymentData.recipientId =
          qrCodeData.merchantId || qrCodeData.customerId;
        paymentData.recipientType = qrCodeData.merchantId
          ? "MERCHANT"
          : "CUSTOMER";
        paymentData.amount = qrCodeData.amount;
      }
    }

    // Validate recipient
    if (paymentData.recipientType === "MERCHANT") {
      recipient = await this.validateMerchant(paymentData.recipientId);
    } else {
      recipient = await this.validateCustomer(paymentData.recipientId);
    }

    if (!recipient) {
      throw new Error("Recipient not found");
    }

    // Create payment record
    const payment = await this.create({
      senderId: paymentData.senderId,
      recipientId: paymentData.recipientId,
      recipientType: paymentData.recipientType,
      qrCodeId: paymentData.qrCodeId || null,
      amount: paymentData.amount,
      currency: paymentData.currency || "USD",
      method: paymentData.method,
      description: paymentData.description || "",
      status: PAYMENT_STATUS.PENDING,
    });

    // Process payment asynchronously
    setImmediate(() =>
      this.processPayment(payment.paymentId, paymentData.loyaltyRedemption),
    );

    return {
      ...payment.toJSON(),
      senderName: sender.name,
      recipientName: recipient.name || recipient.businessName,
    };
  }

  async processPayment(paymentId, loyaltyRedemption = null) {
    const { sequelize } = require("../models");
    const transaction = await sequelize.transaction();

    try {
      const payment = await this.findById(paymentId);
      if (!payment) {
        throw new Error("Payment not found");
      }

      if (payment.status !== PAYMENT_STATUS.PENDING) {
        throw new Error("Payment is not in pending status");
      }

      // Step 1: Fraud Detection
      const fraudResult = await this.checkFraud(payment);
      if (fraudResult.status === "BLOCKED") {
        await payment.markAsBlocked(fraudResult.reason);
        await this.sendNotification(payment, "FRAUD_BLOCKED");
        await transaction.rollback();
        return;
      }

      if (fraudResult.status === "UNDER_REVIEW") {
        await payment.update({
          status: "UNDER_REVIEW",
          fraudAnalysisId: fraudResult.analysisId,
        });
        await this.sendNotification(payment, "MANUAL_REVIEW");
        await transaction.rollback();
        return;
      }

      // Step 2: Mark as processing
      await payment.markAsProcessing();

      // Step 3: Process loyalty redemption if requested
      let discountAmount = 0;
      if (loyaltyRedemption && loyaltyRedemption.redeemPoints) {
        try {
          const redemptionResult = await this.redeemLoyaltyPoints(
            payment.senderId,
            loyaltyRedemption.pointsToRedeem,
          );
          discountAmount = redemptionResult.discountAmount;
        } catch (error) {
          console.warn("Loyalty redemption failed:", error.message);
        }
      }

      const finalAmount = Math.max(0, payment.amount - discountAmount);

      // Step 4: Process through bank integration
      const bankResult = await this.processBankTransaction(
        payment,
        finalAmount,
      );
      if (!bankResult.success) {
        await payment.markAsFailed(bankResult.error);
        await this.sendNotification(payment, "PAYMENT_FAILED");
        await transaction.rollback();
        return;
      }

      // Step 5: Mark payment as completed
      await payment.markAsCompleted(bankResult.transactionId);

      // Step 6: Record transaction
      await this.recordTransaction(payment, bankResult);

      // Step 7: Process loyalty points for completed payment
      await this.processLoyaltyPoints(payment);

      // Step 8: Mark QR code as used if applicable
      if (payment.qrCodeId) {
        await this.markQRCodeAsUsed(payment.qrCodeId);
      }

      // Step 9: Send success notifications
      await this.sendNotification(payment, "PAYMENT_SUCCESS");

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      const payment = await this.findById(paymentId);
      if (payment && payment.status === PAYMENT_STATUS.PROCESSING) {
        await payment.markAsFailed(error.message);
        await this.sendNotification(payment, "PAYMENT_FAILED");
      }

      throw error;
    }
  }

  // External service integrations
  async validateCustomer(customerId) {
    try {
      const response = await axios.get(
        `${this.customerServiceUrl}/customers/${customerId}`,
        {
          timeout: 5000,
        },
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error("Customer service unavailable");
    }
  }

  async validateMerchant(merchantId) {
    try {
      const response = await axios.get(
        `${this.merchantServiceUrl}/merchants/${merchantId}`,
        {
          timeout: 5000,
        },
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error("Merchant service unavailable");
    }
  }

  async validateQRCode(qrCodeId) {
    try {
      const response = await axios.get(`${this.qrServiceUrl}/qr/${qrCodeId}`, {
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404 || error.response?.status === 410) {
        return null;
      }
      throw new Error("QR service unavailable");
    }
  }

  async checkFraud(payment) {
    try {
      const response = await axios.post(
        `${this.fraudServiceUrl}/fraud/analyze`,
        {
          paymentId: payment.paymentId,
          senderId: payment.senderId,
          recipientId: payment.recipientId,
          amount: payment.amount,
          method: payment.method,
        },
        { timeout: 10000 },
      );

      return response.data;
    } catch (error) {
      console.warn("Fraud service unavailable, proceeding without check");
      return { status: "CLEAR", riskScore: 0 };
    }
  }

  async processBankTransaction(payment, amount) {
    try {
      const response = await axios.post(
        `${this.bankServiceUrl}/bank/process`,
        {
          paymentId: payment.paymentId,
          senderId: payment.senderId,
          recipientId: payment.recipientId,
          amount: amount,
          currency: payment.currency,
          description: payment.description,
          correlationId: payment.correlationId,
        },
        { timeout: 30000 },
      );

      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Bank processing failed",
      };
    }
  }

  async recordTransaction(payment, bankResult) {
    try {
      await axios.post(
        `${this.transactionServiceUrl}/transactions`,
        {
          paymentId: payment.paymentId,
          senderId: payment.senderId,
          recipientId: payment.recipientId,
          amount: payment.amount,
          currency: payment.currency,
          status: "COMPLETED",
          bankTransactionId: bankResult.transactionId,
          completedAt: new Date().toISOString(),
        },
        { timeout: 10000 },
      );
    } catch (error) {
      console.error("Failed to record transaction:", error.message);
    }
  }

  async redeemLoyaltyPoints(customerId, pointsToRedeem) {
    try {
      const response = await axios.post(
        `${this.loyaltyServiceUrl}/loyalty/${customerId}/redeem`,
        {
          pointsToRedeem,
        },
        { timeout: 10000 },
      );

      return response.data;
    } catch (error) {
      throw new Error("Loyalty redemption failed: " + error.message);
    }
  }

  async processLoyaltyPoints(payment) {
    try {
      await axios.post(
        `${this.loyaltyServiceUrl}/loyalty/process`,
        {
          customerId: payment.senderId,
          paymentId: payment.paymentId,
          amount: payment.amount,
          method: payment.method,
          recipientType: payment.recipientType,
        },
        { timeout: 10000 },
      );
    } catch (error) {
      console.error("Failed to process loyalty points:", error.message);
    }
  }

  async markQRCodeAsUsed(qrCodeId) {
    try {
      await axios.patch(
        `${this.qrServiceUrl}/qr/${qrCodeId}`,
        {
          status: "USED",
        },
        { timeout: 5000 },
      );
    } catch (error) {
      console.error("Failed to mark QR code as used:", error.message);
    }
  }

  async sendNotification(payment, type) {
    try {
      await axios.post(
        `${this.notificationServiceUrl}/notifications/payment`,
        {
          paymentId: payment.paymentId,
          type,
          senderId: payment.senderId,
          recipientId: payment.recipientId,
          amount: payment.amount,
        },
        { timeout: 10000 },
      );
    } catch (error) {
      console.error("Failed to send notification:", error.message);
    }
  }

  // Query methods
  async getCustomerPayments(customerId, filters = {}) {
    const { Op } = require("sequelize");
    const where = {
      [Op.or]: [{ senderId: customerId }, { recipientId: customerId }],
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.fromDate && filters.toDate) {
      where.createdAt = {
        [Op.between]: [new Date(filters.fromDate), new Date(filters.toDate)],
      };
    }

    const { page = 0, size = 20 } = filters;
    const offset = page * size;
    const limit = Math.min(size, 100);

    const result = await this.model.findAndCountAll({
      where,
      offset,
      limit,
      order: [["createdAt", "DESC"]],
    });

    return {
      content: result.rows,
      totalElements: result.count,
      totalPages: Math.ceil(result.count / size),
      size,
      number: page,
    };
  }

  async cancelPayment(paymentId, reason) {
    const payment = await this.findById(paymentId);
    if (!payment) {
      return null;
    }

    await payment.cancel(reason);
    await this.sendNotification(payment, "PAYMENT_CANCELLED");

    return payment;
  }

  async retryPayment(paymentId) {
    const payment = await this.findById(paymentId);
    if (!payment) {
      return null;
    }

    if (!payment.canRetry()) {
      throw new Error("Payment cannot be retried");
    }

    await payment.incrementRetryCount();
    payment.status = PAYMENT_STATUS.PENDING;
    await payment.save();

    // Process payment asynchronously
    setImmediate(() => this.processPayment(payment.paymentId));

    return payment;
  }
}

module.exports = PaymentService;
