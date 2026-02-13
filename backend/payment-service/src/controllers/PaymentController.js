const PaymentService = require("../services/PaymentService");
const { Payment } = require("../models");
const {
  asyncHandler,
  HTTP_STATUS,
  createErrorResponse,
} = require("../../../shared/utils");

// Initialize payment service
const paymentService = new PaymentService(Payment);

class PaymentController {
  // POST /api/v1/payments - Initiate payment
  initiatePayment = asyncHandler(async (req, res) => {
    try {
      const payment = await paymentService.initiatePayment(req.body);

      res.status(HTTP_STATUS.CREATED).json({
        paymentId: payment.paymentId,
        senderId: payment.senderId,
        senderName: payment.senderName,
        recipientId: payment.recipientId,
        recipientName: payment.recipientName,
        recipientType: payment.recipientType,
        amount: parseFloat(payment.amount),
        currency: payment.currency,
        method: payment.method,
        status: payment.status,
        description: payment.description,
        createdAt: payment.createdAt,
        correlationId: payment.correlationId,
      });
    } catch (error) {
      if (error.message.includes("not found")) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(createErrorResponse("NOT_FOUND", error.message, [], req.path));
      }

      if (error.message.includes("expired")) {
        return res
          .status(HTTP_STATUS.GONE)
          .json(createErrorResponse("QR_EXPIRED", error.message, [], req.path));
      }

      if (error.message.includes("Insufficient")) {
        return res
          .status(HTTP_STATUS.PAYMENT_REQUIRED)
          .json(
            createErrorResponse(
              "INSUFFICIENT_FUNDS",
              error.message,
              [],
              req.path,
            ),
          );
      }

      throw error;
    }
  });

  // GET /api/v1/payments - Get customer payments
  getPayments = asyncHandler(async (req, res) => {
    const { customerId, status, fromDate, toDate, page, size } = req.query;

    if (!customerId) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          createErrorResponse(
            "VALIDATION_ERROR",
            "Customer ID is required",
            [],
            req.path,
          ),
        );
    }

    const filters = {
      status,
      fromDate,
      toDate,
      page: parseInt(page) || 0,
      size: parseInt(size) || 20,
    };

    const result = await paymentService.getCustomerPayments(
      customerId,
      filters,
    );

    const response = {
      content: result.content.map((payment) => ({
        paymentId: payment.paymentId,
        recipientId: payment.recipientId,
        recipientType: payment.recipientType,
        amount: parseFloat(payment.amount),
        currency: payment.currency,
        method: payment.method,
        status: payment.status,
        description: payment.description,
        createdAt: payment.createdAt,
        completedAt: payment.completedAt,
      })),
      totalElements: result.totalElements,
      totalPages: result.totalPages,
      size: result.size,
      number: result.number,
    };

    res.json(response);
  });

  // GET /api/v1/payments/:paymentId - Get payment details
  getPayment = asyncHandler(async (req, res) => {
    const { paymentId } = req.params;
    const payment = await paymentService.findById(paymentId);

    if (!payment) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          createErrorResponse("NOT_FOUND", "Payment not found", [], req.path),
        );
    }

    res.json({
      paymentId: payment.paymentId,
      senderId: payment.senderId,
      recipientId: payment.recipientId,
      recipientType: payment.recipientType,
      amount: parseFloat(payment.amount),
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      description: payment.description,
      bankTransactionId: payment.bankTransactionId,
      correlationId: payment.correlationId,
      createdAt: payment.createdAt,
      processedAt: payment.processedAt,
      completedAt: payment.completedAt,
      failureReason: payment.failureReason,
      retryCount: payment.retryCount,
    });
  });

  // PATCH /api/v1/payments/:paymentId - Update payment status (admin only)
  updatePaymentStatus = asyncHandler(async (req, res) => {
    const { paymentId } = req.params;
    const { status, reason } = req.body;

    const payment = await paymentService.findById(paymentId);
    if (!payment) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          createErrorResponse("NOT_FOUND", "Payment not found", [], req.path),
        );
    }

    // Admin status updates
    if (status === "APPROVED" && payment.status === "UNDER_REVIEW") {
      payment.status = "PENDING";
      await payment.save();

      // Process payment asynchronously
      setImmediate(() => paymentService.processPayment(payment.paymentId));
    } else if (status === "REJECTED") {
      await payment.markAsBlocked(reason);
    }

    res.json({
      paymentId: payment.paymentId,
      status: payment.status,
      updatedAt: new Date().toISOString(),
    });
  });

  // POST /api/v1/payments/:paymentId/cancel - Cancel payment
  cancelPayment = asyncHandler(async (req, res) => {
    const { paymentId } = req.params;
    const { reason } = req.body;

    try {
      const payment = await paymentService.cancelPayment(paymentId, reason);

      if (!payment) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(
            createErrorResponse("NOT_FOUND", "Payment not found", [], req.path),
          );
      }

      res.json({
        paymentId: payment.paymentId,
        status: payment.status,
        cancelledAt: new Date().toISOString(),
        reason,
      });
    } catch (error) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          createErrorResponse("INVALID_OPERATION", error.message, [], req.path),
        );
    }
  });

  // POST /api/v1/payments/qr - Process QR payment
  processQrPayment = asyncHandler(async (req, res) => {
    const { senderId, qrData, loyaltyRedemption } = req.body;

    // Parse QR data (simplified - would use QR service in production)
    let qrParsed;
    try {
      // Mock QR parsing - in real implementation would call QR service
      const parts = qrData.split("_");
      qrParsed = {
        type: parts[1], // MERCHANT or CUSTOMER
        recipientId: parseInt(parts[2]),
        amount: parseFloat(parts[4]),
        expiry: parseInt(parts[6]),
      };

      // Check expiry
      if (Date.now() / 1000 > qrParsed.expiry) {
        return res
          .status(HTTP_STATUS.GONE)
          .json(
            createErrorResponse(
              "QR_EXPIRED",
              "QR code has expired",
              [],
              req.path,
            ),
          );
      }
    } catch (error) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          createErrorResponse(
            "VALIDATION_ERROR",
            "Invalid QR code format",
            [],
            req.path,
          ),
        );
    }

    const paymentData = {
      senderId,
      recipientId: qrParsed.recipientId,
      recipientType: qrParsed.type,
      amount: qrParsed.amount,
      currency: "USD",
      method: "QR_CODE",
      loyaltyRedemption,
    };

    const payment = await paymentService.initiatePayment(paymentData);

    res.status(HTTP_STATUS.CREATED).json({
      paymentId: payment.paymentId,
      amount: parseFloat(payment.amount),
      recipientName: payment.recipientName,
      status: payment.status,
      createdAt: payment.createdAt,
    });
  });

  // POST /api/v1/payments/retry/:paymentId - Retry failed payment
  retryPayment = asyncHandler(async (req, res) => {
    const { paymentId } = req.params;

    try {
      const payment = await paymentService.retryPayment(paymentId);

      if (!payment) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(
            createErrorResponse("NOT_FOUND", "Payment not found", [], req.path),
          );
      }

      res.json({
        paymentId: payment.paymentId,
        status: payment.status,
        retryCount: payment.retryCount,
        retriedAt: new Date().toISOString(),
      });
    } catch (error) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          createErrorResponse("INVALID_OPERATION", error.message, [], req.path),
        );
    }
  });

  // GET /health - Health check
  healthCheck = asyncHandler(async (req, res) => {
    const { createHealthResponse } = require("../../../shared/utils");

    // Check database connection
    const { sequelize } = require("../models");
    let dbStatus = "UP";
    try {
      await sequelize.authenticate();
    } catch (error) {
      dbStatus = "DOWN";
    }

    // Check external service dependencies
    const dependencies = {
      database: dbStatus,
      customerService: "UP", // Would actually ping the service
      merchantService: "UP",
      qrService: "UP",
      fraudService: "UP",
      bankService: "UP",
    };

    const health = createHealthResponse("payment-service", dependencies);
    const status = health.status === "UP" ? HTTP_STATUS.OK : 503;
    res.status(status).json(health);
  });
}

module.exports = new PaymentController();
