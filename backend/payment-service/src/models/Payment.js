const { DataTypes } = require("sequelize");
const { createModel } = require("../../../shared/database");
const { PAYMENT_STATUS, PAYMENT_METHOD } = require("../../../shared/utils");
const { v4: uuidv4 } = require("uuid");

const createPaymentModel = (sequelize) => {
  const Payment = createModel(
    sequelize,
    "Payment",
    {
      paymentId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "payment_id",
      },
      senderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "sender_id",
      },
      recipientId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "recipient_id",
      },
      recipientType: {
        type: DataTypes.ENUM("CUSTOMER", "MERCHANT"),
        allowNull: false,
        field: "recipient_type",
      },
      qrCodeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "qr_code_id",
      },
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: {
          min: 0.01,
        },
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: "USD",
        validate: {
          is: /^[A-Z]{3}$/,
        },
      },
      method: {
        type: DataTypes.ENUM(...Object.values(PAYMENT_METHOD)),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(...Object.values(PAYMENT_STATUS)),
        allowNull: false,
        defaultValue: PAYMENT_STATUS.PENDING,
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      bankTransactionId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
        field: "bank_transaction_id",
      },
      fraudAnalysisId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "fraud_analysis_id",
      },
      loyaltyTransactionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "loyalty_transaction_id",
      },
      processedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "processed_at",
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "completed_at",
      },
      failureReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "failure_reason",
      },
      retryCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "retry_count",
      },
      correlationId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: () => uuidv4(),
        field: "correlation_id",
      },
    },
    {
      tableName: "payments",
      indexes: [
        {
          fields: ["sender_id"],
        },
        {
          fields: ["recipient_id"],
        },
        {
          fields: ["status"],
        },
        {
          fields: ["method"],
        },
        {
          fields: ["created_at"],
        },
        {
          unique: true,
          fields: ["bank_transaction_id"],
        },
        {
          fields: ["correlation_id"],
        },
      ],
      hooks: {
        beforeUpdate: (payment) => {
          if (
            payment.status === PAYMENT_STATUS.PROCESSING &&
            !payment.processedAt
          ) {
            payment.processedAt = new Date();
          }
          if (
            payment.status === PAYMENT_STATUS.COMPLETED &&
            !payment.completedAt
          ) {
            payment.completedAt = new Date();
          }
        },
      },
    },
  );

  // Instance methods
  Payment.prototype.markAsProcessing = function () {
    this.status = PAYMENT_STATUS.PROCESSING;
    this.processedAt = new Date();
    return this.save();
  };

  Payment.prototype.markAsCompleted = function (bankTransactionId) {
    this.status = PAYMENT_STATUS.COMPLETED;
    this.bankTransactionId = bankTransactionId;
    this.completedAt = new Date();
    return this.save();
  };

  Payment.prototype.markAsFailed = function (reason) {
    this.status = PAYMENT_STATUS.FAILED;
    this.failureReason = reason;
    return this.save();
  };

  Payment.prototype.markAsBlocked = function (reason) {
    this.status = PAYMENT_STATUS.BLOCKED;
    this.failureReason = reason;
    return this.save();
  };

  Payment.prototype.cancel = function (reason) {
    if (
      this.status !== PAYMENT_STATUS.PENDING &&
      this.status !== PAYMENT_STATUS.PROCESSING
    ) {
      throw new Error("Payment cannot be cancelled in current status");
    }
    this.status = PAYMENT_STATUS.CANCELLED;
    this.failureReason = reason;
    return this.save();
  };

  Payment.prototype.incrementRetryCount = function () {
    this.retryCount += 1;
    return this.save();
  };

  Payment.prototype.canRetry = function () {
    return this.status === PAYMENT_STATUS.FAILED && this.retryCount < 3;
  };

  // Class methods
  Payment.findBySender = function (senderId, options = {}) {
    return this.findAll({
      where: { senderId },
      order: [["created_at", "DESC"]],
      ...options,
    });
  };

  Payment.findByRecipient = function (recipientId, options = {}) {
    return this.findAll({
      where: { recipientId },
      order: [["created_at", "DESC"]],
      ...options,
    });
  };

  Payment.findByStatus = function (status, options = {}) {
    return this.findAll({
      where: { status },
      order: [["created_at", "ASC"]],
      ...options,
    });
  };

  Payment.findPendingPayments = function (options = {}) {
    return this.findByStatus(PAYMENT_STATUS.PENDING, options);
  };

  Payment.findProcessingPayments = function (options = {}) {
    return this.findByStatus(PAYMENT_STATUS.PROCESSING, options);
  };

  Payment.findByCorrelationId = function (correlationId) {
    return this.findOne({ where: { correlationId } });
  };

  Payment.findByDateRange = function (startDate, endDate, options = {}) {
    const { Op } = require("sequelize");
    return this.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [["created_at", "DESC"]],
      ...options,
    });
  };

  return Payment;
};

module.exports = createPaymentModel;
