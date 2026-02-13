// Shared utility functions and constants for all microservices

const winston = require("winston");

// Standard HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  GONE: 410,
  INTERNAL_SERVER_ERROR: 500,
};

// Standard error codes
const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  FRAUD_DETECTED: "FRAUD_DETECTED",
  QR_EXPIRED: "QR_EXPIRED",
  INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS",
  SYSTEM_ERROR: "SYSTEM_ERROR",
};

// Enums
const CUSTOMER_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
};

const LOYALTY_TIER = {
  SILVER: "SILVER",
  GOLD: "GOLD",
  PLATINUM: "PLATINUM",
};

const PAYMENT_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  BLOCKED: "BLOCKED",
};

const PAYMENT_METHOD = {
  QR_CODE: "QR_CODE",
  MANUAL: "MANUAL",
  BANK_TRANSFER: "BANK_TRANSFER",
};

const FRAUD_STATUS = {
  CLEAR: "CLEAR",
  SUSPICIOUS: "SUSPICIOUS",
  BLOCKED: "BLOCKED",
  UNDER_REVIEW: "UNDER_REVIEW",
};

const QR_STATUS = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  USED: "USED",
  CANCELLED: "CANCELLED",
};

// Logger configuration
const createLogger = (serviceName) => {
  return winston.createLogger({
    level: "info",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(
        ({ timestamp, level, message, service, ...metadata }) => {
          return JSON.stringify({
            timestamp,
            level,
            service: service || serviceName,
            message,
            ...metadata,
          });
        },
      ),
    ),
    defaultMeta: { service: serviceName },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }),
      new winston.transports.File({
        filename: `logs/${serviceName}-error.log`,
        level: "error",
      }),
      new winston.transports.File({
        filename: `logs/${serviceName}.log`,
      }),
    ],
  });
};

// Standard error response format
const createErrorResponse = (error, message, details = [], path = "") => {
  return {
    error,
    message,
    details: Array.isArray(details) ? details : [details],
    timestamp: new Date().toISOString(),
    path,
  };
};

// Standard success response format
const createSuccessResponse = (data, meta = {}) => {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
};

// Pagination helper
const createPaginationResponse = (data, page, size, totalElements) => {
  const totalPages = Math.ceil(totalElements / size);

  return {
    content: data,
    totalElements,
    totalPages,
    size: parseInt(size),
    number: parseInt(page),
    first: page === 0,
    last: page >= totalPages - 1,
    numberOfElements: data.length,
  };
};

// IBAN validation
const validateIban = (iban) => {
  // Remove spaces and convert to uppercase
  const cleanIban = iban.replace(/\s/g, "").toUpperCase();

  // Check length (minimum 15, maximum 34)
  if (cleanIban.length < 15 || cleanIban.length > 34) {
    return { valid: false, error: "Invalid IBAN length" };
  }

  // Check format (2 letters + 2 digits + alphanumeric)
  const ibanPattern = /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/;
  if (!ibanPattern.test(cleanIban)) {
    return { valid: false, error: "Invalid IBAN format" };
  }

  // Move first 4 characters to end
  const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4);

  // Replace letters with numbers (A=10, B=11, ..., Z=35)
  let numericString = "";
  for (const char of rearranged) {
    if (char >= "A" && char <= "Z") {
      numericString += (char.charCodeAt(0) - "A".charCodeAt(0) + 10).toString();
    } else {
      numericString += char;
    }
  }

  // Calculate mod 97
  let remainder = 0;
  for (const digit of numericString) {
    remainder = (remainder * 10 + parseInt(digit)) % 97;
  }

  const valid = remainder === 1;

  return {
    valid,
    iban: cleanIban,
    countryCode: cleanIban.slice(0, 2),
    checkDigits: cleanIban.slice(2, 4),
    bankCode: cleanIban.slice(4, 8),
    accountNumber: cleanIban.slice(8),
  };
};

// Phone number validation
const validatePhoneNumber = (phone) => {
  // International format: +[country code][number]
  const phonePattern = /^\+[1-9]\d{1,14}$/;
  return phonePattern.test(phone);
};

// Email validation
const validateEmail = (email) => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
};

// Generate correlation ID for request tracing
const generateCorrelationId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

// Async error handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Global error handler middleware
const globalErrorHandler = (logger) => (error, req, res, next) => {
  logger.error("Unhandled error", {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    correlationId: req.correlationId,
  });

  // Don't expose internal errors in production
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : error.message;

  res
    .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    .json(createErrorResponse(ERROR_CODES.SYSTEM_ERROR, message, [], req.path));
};

// Request logging middleware
const requestLogger = (logger) => (req, res, next) => {
  req.correlationId = generateCorrelationId();

  logger.info("Incoming request", {
    method: req.method,
    path: req.path,
    correlationId: req.correlationId,
    userAgent: req.get("User-Agent"),
    ip: req.ip,
  });

  next();
};

// Health check response
const createHealthResponse = (serviceName, dependencies = {}) => {
  const status = Object.values(dependencies).every((dep) => dep === "UP")
    ? "UP"
    : "DOWN";

  return {
    status,
    service: serviceName,
    timestamp: new Date().toISOString(),
    dependencies,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || "1.0.0",
  };
};

module.exports = {
  HTTP_STATUS,
  ERROR_CODES,
  CUSTOMER_STATUS,
  LOYALTY_TIER,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  FRAUD_STATUS,
  QR_STATUS,
  createLogger,
  createErrorResponse,
  createSuccessResponse,
  createPaginationResponse,
  validateIban,
  validatePhoneNumber,
  validateEmail,
  generateCorrelationId,
  asyncHandler,
  globalErrorHandler,
  requestLogger,
  createHealthResponse,
};
