const QrService = require("../services/QrService");
const { QrCode } = require("../models");
const {
  asyncHandler,
  HTTP_STATUS,
  createErrorResponse,
} = require("../../../shared/utils");

// Initialize QR service
const qrService = new QrService();

class QrController {
  // POST /api/v1/qr-codes - Generate QR code
  generateQrCode = asyncHandler(async (req, res) => {
    try {
      const qrCode = await qrService.createQrCode(req.body);

      res.status(HTTP_STATUS.CREATED).json({
        qrId: qrCode.qrId,
        qrData: qrCode.qrData,
        type: qrCode.type,
        ownerId: qrCode.ownerId,
        ownerType: qrCode.ownerType,
        amount: qrCode.amount ? parseFloat(qrCode.amount) : null,
        currency: qrCode.currency,
        description: qrCode.description,
        status: qrCode.status,
        expiryTime: qrCode.expiryTime,
        usageLimit: qrCode.usageLimit,
        usageCount: qrCode.usageCount,
        createdAt: qrCode.createdAt,
      });
    } catch (error) {
      if (error.message.includes("Invalid owner")) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(
            createErrorResponse("INVALID_OWNER", error.message, [], req.path),
          );
      }
      throw error;
    }
  });

  // POST /api/v1/qr-codes/scan - Scan QR code
  scanQrCode = asyncHandler(async (req, res) => {
    const { qrData, scannedBy, location, deviceInfo } = req.body;

    try {
      const result = await qrService.processQrScan(qrData, scannedBy, {
        location,
        deviceInfo,
      });

      res.json({
        qrId: result.qrId,
        type: result.type,
        ownerId: result.ownerId,
        ownerType: result.ownerType,
        amount: result.amount ? parseFloat(result.amount) : null,
        currency: result.currency,
        description: result.description,
        remainingUses: result.remainingUses,
        canBeUsed: result.canBeUsed,
        scannedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error.message.includes("not found")) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(
            createErrorResponse("QR_NOT_FOUND", error.message, [], req.path),
          );
      }

      if (error.message.includes("expired")) {
        return res
          .status(HTTP_STATUS.GONE)
          .json(createErrorResponse("QR_EXPIRED", error.message, [], req.path));
      }

      if (
        error.message.includes("limit reached") ||
        error.message.includes("your own")
      ) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(
            createErrorResponse("QR_INVALID_USE", error.message, [], req.path),
          );
      }

      throw error;
    }
  });

  // POST /api/v1/qr-codes/validate - Validate QR code without scanning
  validateQrCode = asyncHandler(async (req, res) => {
    const { qrData } = req.body;

    try {
      const { qrCode, parsedData } = await qrService.validateQrCode(qrData);

      res.json({
        valid: true,
        qrId: qrCode.qrId,
        type: qrCode.type,
        ownerId: qrCode.ownerId,
        ownerType: qrCode.ownerType,
        amount: qrCode.amount ? parseFloat(qrCode.amount) : null,
        currency: qrCode.currency,
        description: qrCode.description,
        status: qrCode.status,
        canBeUsed: qrCode.canBeUsed(),
        expiryTime: qrCode.expiryTime,
        usageCount: qrCode.usageCount,
        usageLimit: qrCode.usageLimit,
      });
    } catch (error) {
      res.json({
        valid: false,
        error: error.message,
      });
    }
  });

  // GET /api/v1/qr-codes - Get QR codes for owner
  getQrCodes = asyncHandler(async (req, res) => {
    const { ownerId, ownerType, status, type, page, size } = req.query;

    if (!ownerId || !ownerType) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          createErrorResponse(
            "VALIDATION_ERROR",
            "Owner ID and type are required",
            [],
            req.path,
          ),
        );
    }

    const filters = {
      status,
      type,
      page: parseInt(page) || 0,
      size: parseInt(size) || 20,
    };

    const result = await qrService.getQrCodes(
      parseInt(ownerId),
      ownerType,
      filters,
    );

    const response = {
      content: result.content.map((qr) => ({
        qrId: qr.qrId,
        qrData: qr.qrData,
        type: qr.type,
        amount: qr.amount ? parseFloat(qr.amount) : null,
        currency: qr.currency,
        description: qr.description,
        status: qr.status,
        expiryTime: qr.expiryTime,
        usageCount: qr.usageCount,
        usageLimit: qr.usageLimit,
        lastUsedAt: qr.lastUsedAt,
        createdAt: qr.createdAt,
      })),
      totalElements: result.totalElements,
      totalPages: result.totalPages,
      size: result.size,
      number: result.number,
    };

    res.json(response);
  });

  // GET /api/v1/qr-codes/:qrId - Get QR code details
  getQrCodeDetails = asyncHandler(async (req, res) => {
    const { qrId } = req.params;

    try {
      const qrCode = await qrService.getQrCodeDetails(qrId);

      res.json({
        qrId: qrCode.qrId,
        qrData: qrCode.qrData,
        type: qrCode.type,
        ownerId: qrCode.ownerId,
        ownerType: qrCode.ownerType,
        amount: qrCode.amount ? parseFloat(qrCode.amount) : null,
        currency: qrCode.currency,
        description: qrCode.description,
        status: qrCode.status,
        expiryTime: qrCode.expiryTime,
        usageCount: qrCode.usageCount,
        usageLimit: qrCode.usageLimit,
        lastUsedAt: qrCode.lastUsedAt,
        createdAt: qrCode.createdAt,
        updatedAt: qrCode.updatedAt,
        usageHistory:
          qrCode.QrUsages?.map((usage) => ({
            usageId: usage.usageId,
            scannedBy: usage.scannedBy,
            scannedAt: usage.scannedAt,
            amount: usage.amount ? parseFloat(usage.amount) : null,
            status: usage.status,
            paymentId: usage.paymentId,
          })) || [],
      });
    } catch (error) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(createErrorResponse("QR_NOT_FOUND", error.message, [], req.path));
    }
  });

  // PATCH /api/v1/qr-codes/:qrId/status - Update QR code status
  updateQrCodeStatus = asyncHandler(async (req, res) => {
    const { qrId } = req.params;
    const { status, ownerId } = req.body;

    try {
      const qrCode = await qrService.updateQrCodeStatus(qrId, status, ownerId);

      res.json({
        qrId: qrCode.qrId,
        status: qrCode.status,
        updatedAt: qrCode.updatedAt,
      });
    } catch (error) {
      if (error.message.includes("not found")) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(
            createErrorResponse("QR_NOT_FOUND", error.message, [], req.path),
          );
      }

      if (error.message.includes("Unauthorized")) {
        return res
          .status(HTTP_STATUS.FORBIDDEN)
          .json(
            createErrorResponse("UNAUTHORIZED", error.message, [], req.path),
          );
      }

      throw error;
    }
  });

  // GET /api/v1/qr-codes/analytics/:ownerId/:ownerType - Get QR usage analytics
  getQrAnalytics = asyncHandler(async (req, res) => {
    const { ownerId, ownerType } = req.params;
    const { days } = req.query;

    try {
      const analytics = await qrService.getQrUsageAnalytics(
        parseInt(ownerId),
        ownerType,
        parseInt(days) || 30,
      );

      res.json(analytics);
    } catch (error) {
      throw error;
    }
  });

  // POST /api/v1/qr-codes/bulk-generate - Generate multiple QR codes (for merchants)
  bulkGenerateQrCodes = asyncHandler(async (req, res) => {
    const { ownerId, ownerType, qrCodes } = req.body;

    if (!Array.isArray(qrCodes) || qrCodes.length === 0) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          createErrorResponse(
            "VALIDATION_ERROR",
            "QR codes array is required",
            [],
            req.path,
          ),
        );
    }

    if (qrCodes.length > 100) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          createErrorResponse(
            "VALIDATION_ERROR",
            "Maximum 100 QR codes can be generated at once",
            [],
            req.path,
          ),
        );
    }

    try {
      const results = [];
      const errors = [];

      for (let i = 0; i < qrCodes.length; i++) {
        try {
          const qrData = { ...qrCodes[i], ownerId, ownerType };
          const qrCode = await qrService.createQrCode(qrData);
          results.push({
            index: i,
            qrId: qrCode.qrId,
            qrData: qrCode.qrData,
            status: "success",
          });
        } catch (error) {
          errors.push({
            index: i,
            error: error.message,
            status: "error",
          });
        }
      }

      res.status(HTTP_STATUS.CREATED).json({
        successful: results.length,
        failed: errors.length,
        results,
        errors,
      });
    } catch (error) {
      throw error;
    }
  });

  // DELETE /api/v1/qr-codes/:qrId - Revoke QR code
  revokeQrCode = asyncHandler(async (req, res) => {
    const { qrId } = req.params;
    const { ownerId } = req.body;

    try {
      const qrCode = await qrService.updateQrCodeStatus(
        qrId,
        "REVOKED",
        ownerId,
      );

      res.json({
        qrId: qrCode.qrId,
        status: qrCode.status,
        revokedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error.message.includes("not found")) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(
            createErrorResponse("QR_NOT_FOUND", error.message, [], req.path),
          );
      }

      if (error.message.includes("Unauthorized")) {
        return res
          .status(HTTP_STATUS.FORBIDDEN)
          .json(
            createErrorResponse("UNAUTHORIZED", error.message, [], req.path),
          );
      }

      throw error;
    }
  });

  // POST /api/v1/qr-codes/cleanup - Cleanup expired QR codes (admin)
  cleanupExpiredQrCodes = asyncHandler(async (req, res) => {
    try {
      const cleaned = await qrService.cleanupExpiredQrCodes();

      res.json({
        message: "Cleanup completed successfully",
        expiredQrCodes: cleaned,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw error;
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

    const dependencies = {
      database: dbStatus,
      customerService: "UP", // Would actually ping the service
      merchantService: "UP",
    };

    const health = createHealthResponse("qr-service", dependencies);
    const status = health.status === "UP" ? HTTP_STATUS.OK : 503;
    res.status(status).json(health);
  });
}

module.exports = new QrController();
