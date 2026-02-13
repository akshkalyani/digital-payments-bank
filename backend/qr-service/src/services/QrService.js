const { QrCode, QrUsage } = require("../models");
const {
  createLogger,
  QR_TYPES,
  QR_STATUS,
  OWNER_TYPES,
} = require("../../../shared/utils");
const crypto = require("crypto");

class QrService {
  constructor() {
    this.logger = createLogger("qr-service");
  }

  /**
   * Generate QR code data string
   * Format: QR_{type}_{ownerId}_{ownerType}_{amount}_{currency}_{expiry}_{hash}
   */
  generateQrData(
    type,
    ownerId,
    ownerType,
    amount = null,
    currency = "USD",
    expiryMinutes = null,
  ) {
    const currentTime = Math.floor(Date.now() / 1000);
    const expiry = expiryMinutes ? currentTime + expiryMinutes * 60 : 0;

    // Create base string
    const baseString = `QR_${type}_${ownerId}_${ownerType}_${amount || "0"}_${currency}_${expiry}`;

    // Add security hash
    const hash = crypto
      .createHash("sha256")
      .update(baseString + process.env.QR_SECRET || "default-secret")
      .digest("hex")
      .substring(0, 8);

    return `${baseString}_${hash}`;
  }

  /**
   * Parse QR code data
   */
  parseQrData(qrData) {
    try {
      const parts = qrData.split("_");

      if (parts.length !== 8 || parts[0] !== "QR") {
        throw new Error("Invalid QR code format");
      }

      const [, type, ownerId, ownerType, amount, currency, expiry, hash] =
        parts;

      // Verify hash
      const baseString = `QR_${type}_${ownerId}_${ownerType}_${amount}_${currency}_${expiry}`;
      const expectedHash = crypto
        .createHash("sha256")
        .update(baseString + process.env.QR_SECRET || "default-secret")
        .digest("hex")
        .substring(0, 8);

      if (hash !== expectedHash) {
        throw new Error("Invalid QR code hash");
      }

      return {
        type,
        ownerId: parseInt(ownerId),
        ownerType,
        amount: amount === "0" ? null : parseFloat(amount),
        currency,
        expiry: parseInt(expiry),
        isExpired: expiry > 0 && Date.now() / 1000 > parseInt(expiry),
      };
    } catch (error) {
      this.logger.error("Error parsing QR data:", error);
      throw new Error("Invalid QR code format");
    }
  }

  /**
   * Create a new QR code
   */
  async createQrCode(qrData) {
    try {
      const {
        type,
        ownerId,
        ownerType,
        amount,
        currency = "USD",
        description,
        expiryMinutes,
        usageLimit,
      } = qrData;

      // Validate owner exists (would call customer/merchant service)
      await this.validateOwner(ownerId, ownerType);

      // Generate QR data string
      const qrDataString = this.generateQrData(
        type,
        ownerId,
        ownerType,
        amount,
        currency,
        expiryMinutes,
      );

      // Calculate expiry time
      const expiryTime = expiryMinutes
        ? new Date(Date.now() + expiryMinutes * 60 * 1000)
        : null;

      // Create QR code record
      const qrCode = await QrCode.create({
        qrData: qrDataString,
        type,
        ownerId,
        ownerType,
        amount,
        currency,
        description,
        expiryTime,
        usageLimit,
        status: "ACTIVE",
      });

      this.logger.info(
        `QR code created: ${qrCode.qrId} for ${ownerType} ${ownerId}`,
      );
      return qrCode;
    } catch (error) {
      this.logger.error("Error creating QR code:", error);
      throw error;
    }
  }

  /**
   * Validate QR code and get details
   */
  async validateQrCode(qrData) {
    try {
      // Find QR code in database
      const qrCode = await QrCode.findOne({
        where: { qrData },
      });

      if (!qrCode) {
        throw new Error("QR code not found");
      }

      // Check if QR code can be used
      if (!qrCode.canBeUsed()) {
        if (qrCode.isExpired()) {
          throw new Error("QR code has expired");
        }
        if (qrCode.isUsageLimitReached()) {
          throw new Error("QR code usage limit reached");
        }
        if (qrCode.status !== "ACTIVE") {
          throw new Error(`QR code is ${qrCode.status.toLowerCase()}`);
        }
      }

      // Parse QR data for additional validation
      const parsedData = this.parseQrData(qrData);
      if (parsedData.isExpired) {
        await qrCode.expire();
        throw new Error("QR code has expired");
      }

      return {
        qrCode,
        parsedData,
      };
    } catch (error) {
      this.logger.error("Error validating QR code:", error);
      throw error;
    }
  }

  /**
   * Process QR code scan
   */
  async processQrScan(qrData, scannedBy, additionalData = {}) {
    try {
      const { qrCode, parsedData } = await this.validateQrCode(qrData);

      // Prevent self-scanning (customer can't scan their own QR)
      if (qrCode.ownerId === scannedBy && qrCode.ownerType === "CUSTOMER") {
        throw new Error("Cannot scan your own QR code");
      }

      // Record the scan
      await qrCode.markAsUsed(scannedBy);

      this.logger.info(
        `QR code scanned: ${qrCode.qrId} by customer ${scannedBy}`,
      );

      return {
        qrId: qrCode.qrId,
        type: qrCode.type,
        ownerId: qrCode.ownerId,
        ownerType: qrCode.ownerType,
        amount: qrCode.amount,
        currency: qrCode.currency,
        description: qrCode.description,
        remainingUses: qrCode.usageLimit
          ? qrCode.usageLimit - qrCode.usageCount
          : null,
        canBeUsed: qrCode.canBeUsed(),
      };
    } catch (error) {
      this.logger.error("Error processing QR scan:", error);
      throw error;
    }
  }

  /**
   * Get QR codes for owner
   */
  async getQrCodes(ownerId, ownerType, filters = {}) {
    try {
      const { status, type, page = 0, size = 20 } = filters;

      const where = {
        ownerId,
        ownerType,
      };

      if (status) where.status = status;
      if (type) where.type = type;

      const { rows: qrCodes, count: total } = await QrCode.findAndCountAll({
        where,
        include: [
          {
            model: QrUsage,
            required: false,
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: size,
        offset: page * size,
      });

      return {
        content: qrCodes,
        totalElements: total,
        totalPages: Math.ceil(total / size),
        size,
        number: page,
      };
    } catch (error) {
      this.logger.error("Error getting QR codes:", error);
      throw error;
    }
  }

  /**
   * Get QR code details
   */
  async getQrCodeDetails(qrId) {
    try {
      const qrCode = await QrCode.findByPk(qrId, {
        include: [
          {
            model: QrUsage,
            order: [["scannedAt", "DESC"]],
          },
        ],
      });

      if (!qrCode) {
        throw new Error("QR code not found");
      }

      return qrCode;
    } catch (error) {
      this.logger.error("Error getting QR code details:", error);
      throw error;
    }
  }

  /**
   * Update QR code status
   */
  async updateQrCodeStatus(qrId, status, ownerId = null) {
    try {
      const qrCode = await QrCode.findByPk(qrId);

      if (!qrCode) {
        throw new Error("QR code not found");
      }

      // Check ownership if ownerId provided
      if (ownerId && qrCode.ownerId !== ownerId) {
        throw new Error("Unauthorized to modify this QR code");
      }

      const oldStatus = qrCode.status;
      qrCode.status = status;
      await qrCode.save();

      this.logger.info(
        `QR code ${qrId} status updated from ${oldStatus} to ${status}`,
      );
      return qrCode;
    } catch (error) {
      this.logger.error("Error updating QR code status:", error);
      throw error;
    }
  }

  /**
   * Get QR usage analytics
   */
  async getQrUsageAnalytics(ownerId, ownerType, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const qrCodes = await QrCode.findAll({
        where: {
          ownerId,
          ownerType,
          createdAt: {
            [require("sequelize").Op.gte]: startDate,
          },
        },
        include: [
          {
            model: QrUsage,
            where: {
              scannedAt: {
                [require("sequelize").Op.gte]: startDate,
              },
            },
            required: false,
          },
        ],
      });

      const analytics = {
        totalQrCodes: qrCodes.length,
        activeQrCodes: qrCodes.filter((qr) => qr.status === "ACTIVE").length,
        totalScans: qrCodes.reduce((sum, qr) => sum + qr.QrUsages.length, 0),
        uniqueScanners: new Set(
          qrCodes.flatMap((qr) => qr.QrUsages.map((u) => u.scannedBy)),
        ).size,
        scansByDay: {},
        topQrCodes: qrCodes
          .map((qr) => ({
            qrId: qr.qrId,
            description: qr.description,
            scans: qr.QrUsages.length,
            type: qr.type,
            amount: qr.amount,
          }))
          .sort((a, b) => b.scans - a.scans)
          .slice(0, 10),
      };

      // Group scans by day
      qrCodes.forEach((qr) => {
        qr.QrUsages.forEach((usage) => {
          const day = usage.scannedAt.toISOString().split("T")[0];
          analytics.scansByDay[day] = (analytics.scansByDay[day] || 0) + 1;
        });
      });

      return analytics;
    } catch (error) {
      this.logger.error("Error getting QR usage analytics:", error);
      throw error;
    }
  }

  /**
   * Validate owner exists (mock implementation)
   */
  async validateOwner(ownerId, ownerType) {
    // In production, this would call the customer or merchant service
    // For now, just validate the IDs are positive integers
    if (!ownerId || ownerId <= 0) {
      throw new Error("Invalid owner ID");
    }

    if (!["CUSTOMER", "MERCHANT"].includes(ownerType)) {
      throw new Error("Invalid owner type");
    }

    return true;
  }

  /**
   * Cleanup expired QR codes
   */
  async cleanupExpiredQrCodes() {
    try {
      const expiredCount = await QrCode.update(
        { status: "EXPIRED" },
        {
          where: {
            status: "ACTIVE",
            expiryTime: {
              [require("sequelize").Op.lt]: new Date(),
            },
          },
        },
      );

      this.logger.info(`Marked ${expiredCount[0]} QR codes as expired`);
      return expiredCount[0];
    } catch (error) {
      this.logger.error("Error cleaning up expired QR codes:", error);
      throw error;
    }
  }
}

module.exports = QrService;
