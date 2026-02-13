const express = require("express");
const { body, query, param } = require("express-validator");
const { validateRequest } = require("../../../shared/utils");
const QrController = require("../controllers/QrController");

const router = express.Router();

// Validation middleware
const generateQrValidation = [
  body("type")
    .isIn(["MERCHANT", "CUSTOMER", "FIXED_AMOUNT", "DYNAMIC"])
    .withMessage("Invalid QR type"),
  body("ownerId").isInt({ min: 1 }).withMessage("Invalid owner ID"),
  body("ownerType")
    .isIn(["CUSTOMER", "MERCHANT"])
    .withMessage("Invalid owner type"),
  body("amount")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be greater than 0"),
  body("currency")
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage("Currency must be 3 characters"),
  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description too long"),
  body("expiryMinutes")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Expiry minutes must be positive"),
  body("usageLimit")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Usage limit must be positive"),
  validateRequest,
];

const scanQrValidation = [
  body("qrData").isLength({ min: 1 }).withMessage("QR data is required"),
  body("scannedBy").isInt({ min: 1 }).withMessage("Invalid scanner ID"),
  body("location.latitude")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("Invalid latitude"),
  body("location.longitude")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("Invalid longitude"),
  validateRequest,
];

const validateQrValidation = [
  body("qrData").isLength({ min: 1 }).withMessage("QR data is required"),
  validateRequest,
];

const getQrCodesValidation = [
  query("ownerId").isInt({ min: 1 }).withMessage("Invalid owner ID"),
  query("ownerType")
    .isIn(["CUSTOMER", "MERCHANT"])
    .withMessage("Invalid owner type"),
  query("status")
    .optional()
    .isIn(["ACTIVE", "EXPIRED", "USED", "REVOKED"])
    .withMessage("Invalid status"),
  query("type")
    .optional()
    .isIn(["MERCHANT", "CUSTOMER", "FIXED_AMOUNT", "DYNAMIC"])
    .withMessage("Invalid type"),
  query("page")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Page must be non-negative"),
  query("size")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Size must be between 1-100"),
  validateRequest,
];

const updateStatusValidation = [
  param("qrId").isUUID().withMessage("Invalid QR ID format"),
  body("status")
    .isIn(["ACTIVE", "EXPIRED", "USED", "REVOKED"])
    .withMessage("Invalid status"),
  body("ownerId").optional().isInt({ min: 1 }).withMessage("Invalid owner ID"),
  validateRequest,
];

const bulkGenerateValidation = [
  body("ownerId").isInt({ min: 1 }).withMessage("Invalid owner ID"),
  body("ownerType")
    .isIn(["CUSTOMER", "MERCHANT"])
    .withMessage("Invalid owner type"),
  body("qrCodes")
    .isArray({ min: 1, max: 100 })
    .withMessage("QR codes array required (1-100 items)"),
  body("qrCodes.*.type")
    .isIn(["MERCHANT", "CUSTOMER", "FIXED_AMOUNT", "DYNAMIC"])
    .withMessage("Invalid QR type"),
  body("qrCodes.*.amount")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be greater than 0"),
  validateRequest,
];

const revokeQrValidation = [
  param("qrId").isUUID().withMessage("Invalid QR ID format"),
  body("ownerId").isInt({ min: 1 }).withMessage("Owner ID is required"),
  validateRequest,
];

// QR Code routes
router.post("/qr-codes", generateQrValidation, QrController.generateQrCode);
router.post("/qr-codes/scan", scanQrValidation, QrController.scanQrCode);
router.post(
  "/qr-codes/validate",
  validateQrValidation,
  QrController.validateQrCode,
);
router.get("/qr-codes", getQrCodesValidation, QrController.getQrCodes);
router.get(
  "/qr-codes/:qrId",
  [param("qrId").isUUID().withMessage("Invalid QR ID format"), validateRequest],
  QrController.getQrCodeDetails,
);

router.patch(
  "/qr-codes/:qrId/status",
  updateStatusValidation,
  QrController.updateQrCodeStatus,
);
router.post(
  "/qr-codes/bulk-generate",
  bulkGenerateValidation,
  QrController.bulkGenerateQrCodes,
);
router.delete("/qr-codes/:qrId", revokeQrValidation, QrController.revokeQrCode);

// Analytics route
router.get(
  "/qr-codes/analytics/:ownerId/:ownerType",
  [
    param("ownerId").isInt({ min: 1 }).withMessage("Invalid owner ID"),
    param("ownerType")
      .isIn(["CUSTOMER", "MERCHANT"])
      .withMessage("Invalid owner type"),
    query("days")
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage("Days must be between 1-365"),
    validateRequest,
  ],
  QrController.getQrAnalytics,
);

// Admin routes
router.post("/qr-codes/cleanup", QrController.cleanupExpiredQrCodes);

// Health endpoint
router.get("/health", QrController.healthCheck);

module.exports = router;
