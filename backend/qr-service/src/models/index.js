const { createDatabase } = require("../../../shared/database");
const { DataTypes } = require("sequelize");

// Initialize database
const sequelize = createDatabase("qr-service");

// QR Code model
const QrCode = sequelize.define(
  "QrCode",
  {
    qrId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    qrData: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    type: {
      type: DataTypes.ENUM("MERCHANT", "CUSTOMER", "FIXED_AMOUNT", "DYNAMIC"),
      allowNull: false,
    },
    ownerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Customer or Merchant ID",
    },
    ownerType: {
      type: DataTypes.ENUM("CUSTOMER", "MERCHANT"),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: "Fixed amount for FIXED_AMOUNT type QR codes",
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "USD",
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "EXPIRED", "USED", "REVOKED"),
      defaultValue: "ACTIVE",
      allowNull: false,
    },
    expiryTime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When the QR code expires (null for permanent QR codes)",
    },
    usageLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment:
        "Maximum number of times this QR can be used (null for unlimited)",
    },
    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Additional QR code metadata like location, device info, etc.",
    },
  },
  {
    indexes: [
      {
        fields: ["ownerId", "ownerType"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["type"],
      },
      {
        fields: ["expiryTime"],
      },
    ],
    hooks: {
      beforeValidate: (qrCode) => {
        // Auto-expire based on time
        if (
          qrCode.expiryTime &&
          new Date() > qrCode.expiryTime &&
          qrCode.status === "ACTIVE"
        ) {
          qrCode.status = "EXPIRED";
        }

        // Auto-revoke if usage limit exceeded
        if (
          qrCode.usageLimit &&
          qrCode.usageCount >= qrCode.usageLimit &&
          qrCode.status === "ACTIVE"
        ) {
          qrCode.status = "USED";
        }
      },
    },
  },
);

// QR Code Usage tracking
const QrUsage = sequelize.define(
  "QrUsage",
  {
    usageId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    qrId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: QrCode,
        key: "qrId",
      },
    },
    paymentId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "Payment ID if QR was used for payment",
    },
    scannedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Customer ID who scanned the QR",
    },
    scannedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: "Amount processed for this scan",
    },
    status: {
      type: DataTypes.ENUM(
        "SCANNED",
        "PAYMENT_INITIATED",
        "PAYMENT_COMPLETED",
        "PAYMENT_FAILED",
      ),
      defaultValue: "SCANNED",
      allowNull: false,
    },
    location: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "GPS coordinates of where QR was scanned",
    },
    deviceInfo: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Device information of scanner",
    },
  },
  {
    indexes: [
      {
        fields: ["qrId"],
      },
      {
        fields: ["scannedBy"],
      },
      {
        fields: ["scannedAt"],
      },
      {
        fields: ["status"],
      },
    ],
  },
);

// Define associations
QrCode.hasMany(QrUsage, { foreignKey: "qrId", onDelete: "CASCADE" });
QrUsage.belongsTo(QrCode, { foreignKey: "qrId" });

// Instance methods
QrCode.prototype.isExpired = function () {
  if (this.expiryTime && new Date() > this.expiryTime) {
    return true;
  }
  return false;
};

QrCode.prototype.isUsageLimitReached = function () {
  if (this.usageLimit && this.usageCount >= this.usageLimit) {
    return true;
  }
  return false;
};

QrCode.prototype.canBeUsed = function () {
  return (
    this.status === "ACTIVE" && !this.isExpired() && !this.isUsageLimitReached()
  );
};

QrCode.prototype.markAsUsed = async function (
  scannedBy,
  amount = null,
  paymentId = null,
) {
  // Record usage
  await QrUsage.create({
    qrId: this.qrId,
    paymentId,
    scannedBy,
    amount,
    status: paymentId ? "PAYMENT_INITIATED" : "SCANNED",
  });

  // Update usage count
  this.usageCount += 1;
  this.lastUsedAt = new Date();

  // Check if should be marked as used
  if (this.usageLimit && this.usageCount >= this.usageLimit) {
    this.status = "USED";
  }

  await this.save();
  return this;
};

QrCode.prototype.expire = async function () {
  this.status = "EXPIRED";
  await this.save();
  return this;
};

QrCode.prototype.revoke = async function () {
  this.status = "REVOKED";
  await this.save();
  return this;
};

module.exports = {
  sequelize,
  QrCode,
  QrUsage,
};
