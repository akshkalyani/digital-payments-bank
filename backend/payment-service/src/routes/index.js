const express = require("express");
const { body, query, param } = require("express-validator");
const { validateRequest } = require("../../../shared/utils");
const PaymentController = require("../controllers/PaymentController");

const router = express.Router();

// Validation middleware
const initiatePaymentValidation = [
  body("senderId").isInt({ min: 1 }).withMessage("Invalid sender ID"),
  body("recipientId").isInt({ min: 1 }).withMessage("Invalid recipient ID"),
  body("recipientType")
    .isIn(["CUSTOMER", "MERCHANT"])
    .withMessage("Invalid recipient type"),
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be greater than 0"),
  body("currency")
    .isLength({ min: 3, max: 3 })
    .withMessage("Currency must be 3 characters"),
  body("method")
    .isIn(["BANK_TRANSFER", "QR_CODE", "DIRECT"])
    .withMessage("Invalid payment method"),
  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description too long"),
  body("loyaltyRedemption.points")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Invalid loyalty points"),
  validateRequest,
];

const getPaymentsValidation = [
  query("customerId").isInt({ min: 1 }).withMessage("Invalid customer ID"),
  query("status")
    .optional()
    .isIn([
      "PENDING",
      "PROCESSING",
      "COMPLETED",
      "FAILED",
      "CANCELLED",
      "UNDER_REVIEW",
      "BLOCKED",
    ])
    .withMessage("Invalid status"),
  query("fromDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid from date format"),
  query("toDate").optional().isISO8601().withMessage("Invalid to date format"),
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
  param("paymentId").isUUID().withMessage("Invalid payment ID format"),
  body("status").isIn(["APPROVED", "REJECTED"]).withMessage("Invalid status"),
  body("reason")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Reason too long"),
  validateRequest,
];

const cancelPaymentValidation = [
  param("paymentId").isUUID().withMessage("Invalid payment ID format"),
  body("reason")
    .isLength({ min: 1, max: 500 })
    .withMessage("Reason is required and must be under 500 characters"),
  validateRequest,
];

const qrPaymentValidation = [
  body("senderId").isInt({ min: 1 }).withMessage("Invalid sender ID"),
  body("qrData").isLength({ min: 1 }).withMessage("QR data is required"),
  body("loyaltyRedemption.points")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Invalid loyalty points"),
  validateRequest,
];

// Payment routes
router.post(
  "/payments",
  initiatePaymentValidation,
  PaymentController.initiatePayment,
);
router.get("/payments", getPaymentsValidation, PaymentController.getPayments);
router.get(
  "/payments/:paymentId",
  [
    param("paymentId").isUUID().withMessage("Invalid payment ID format"),
    validateRequest,
  ],
  PaymentController.getPayment,
);

router.patch(
  "/payments/:paymentId",
  updateStatusValidation,
  PaymentController.updatePaymentStatus,
);
router.post(
  "/payments/:paymentId/cancel",
  cancelPaymentValidation,
  PaymentController.cancelPayment,
);
router.post(
  "/payments/qr",
  qrPaymentValidation,
  PaymentController.processQrPayment,
);
router.post(
  "/payments/retry/:paymentId",
  [
    param("paymentId").isUUID().withMessage("Invalid payment ID format"),
    validateRequest,
  ],
  PaymentController.retryPayment,
);

// Health endpoint
router.get("/health", PaymentController.healthCheck);

module.exports = router;
