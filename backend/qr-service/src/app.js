const express = require("express");
const { sequelize } = require("./models");
const routes = require("./routes");
const {
  requestLogger,
  globalErrorHandler,
  createLogger,
} = require("../../shared/utils");

const app = express();
const logger = createLogger("qr-service");
const PORT = process.env.PORT || 8083;

// Middleware
app.use(express.json());
app.use(requestLogger);

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// API routes
app.use("/api/v1", routes);

// Default route
app.get("/", (req, res) => {
  res.json({
    service: "QR Code Service",
    version: "1.0.0",
    status: "running",
    timestamp: new Date().toISOString(),
    endpoints: [
      "POST /api/v1/qr-codes - Generate QR code",
      "POST /api/v1/qr-codes/scan - Scan QR code",
      "POST /api/v1/qr-codes/validate - Validate QR code",
      "GET /api/v1/qr-codes - Get QR codes for owner",
      "GET /api/v1/qr-codes/:qrId - Get QR code details",
      "PATCH /api/v1/qr-codes/:qrId/status - Update QR status",
      "POST /api/v1/qr-codes/bulk-generate - Bulk generate QR codes",
      "DELETE /api/v1/qr-codes/:qrId - Revoke QR code",
      "GET /api/v1/qr-codes/analytics/:ownerId/:ownerType - Get analytics",
      "POST /api/v1/qr-codes/cleanup - Cleanup expired QR codes",
      "GET /api/v1/health - Health check",
    ],
  });
});

// Swagger documentation
app.get("/api-docs", (req, res) => {
  const swaggerSpec = {
    openapi: "3.0.0",
    info: {
      title: "QR Code Service API",
      version: "1.0.0",
      description: "QR code generation and management microservice",
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server",
      },
    ],
    paths: {
      "/api/v1/qr-codes": {
        post: {
          summary: "Generate QR code",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["type", "ownerId", "ownerType"],
                  properties: {
                    type: {
                      type: "string",
                      enum: ["MERCHANT", "CUSTOMER", "FIXED_AMOUNT", "DYNAMIC"],
                    },
                    ownerId: { type: "integer", example: 1 },
                    ownerType: {
                      type: "string",
                      enum: ["CUSTOMER", "MERCHANT"],
                    },
                    amount: { type: "number", example: 100.5 },
                    currency: { type: "string", example: "USD" },
                    description: {
                      type: "string",
                      example: "Payment for services",
                    },
                    expiryMinutes: { type: "integer", example: 60 },
                    usageLimit: { type: "integer", example: 1 },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "QR code generated successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      qrId: { type: "string", format: "uuid" },
                      qrData: { type: "string" },
                      type: { type: "string" },
                      status: { type: "string" },
                      createdAt: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
          },
        },
        get: {
          summary: "Get QR codes for owner",
          parameters: [
            {
              name: "ownerId",
              in: "query",
              required: true,
              schema: { type: "integer" },
            },
            {
              name: "ownerType",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
            { name: "status", in: "query", schema: { type: "string" } },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 0 },
            },
            {
              name: "size",
              in: "query",
              schema: { type: "integer", default: 20 },
            },
          ],
          responses: {
            200: { description: "QR codes retrieved successfully" },
          },
        },
      },
      "/api/v1/qr-codes/scan": {
        post: {
          summary: "Scan QR code",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["qrData", "scannedBy"],
                  properties: {
                    qrData: {
                      type: "string",
                      example:
                        "QR_MERCHANT_1_MERCHANT_100.50_USD_1640995200_abcd1234",
                    },
                    scannedBy: { type: "integer", example: 2 },
                    location: {
                      type: "object",
                      properties: {
                        latitude: { type: "number" },
                        longitude: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "QR code scanned successfully" },
            404: { description: "QR code not found" },
            410: { description: "QR code expired" },
          },
        },
      },
      "/api/v1/health": {
        get: {
          summary: "Health check",
          responses: {
            200: { description: "Service is healthy" },
          },
        },
      },
    },
  };
  res.json(swaggerSpec);
});

// Error handling
app.use(globalErrorHandler);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: "Endpoint not found",
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

// Database initialization and server start
async function startServer() {
  try {
    // Initialize database
    await sequelize.authenticate();
    logger.info("Database connected successfully");

    await sequelize.sync({ force: false });
    logger.info("Database synchronized");

    app.listen(PORT, () => {
      logger.info(`QR Service started on port ${PORT}`);
      logger.info(
        `API Documentation available at http://localhost:${PORT}/api-docs`,
      );
      logger.info(
        `Health check available at http://localhost:${PORT}/api/v1/health`,
      );
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Background job to cleanup expired QR codes
function startCleanupJob() {
  const QrService = require("./services/QrService");
  const qrService = new QrService();

  // Run cleanup every hour
  setInterval(
    async () => {
      try {
        await qrService.cleanupExpiredQrCodes();
      } catch (error) {
        logger.error("Error in cleanup job:", error);
      }
    },
    60 * 60 * 1000,
  ); // 1 hour
}

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down gracefully...");
  await sequelize.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down gracefully...");
  await sequelize.close();
  process.exit(0);
});

// Start server if this file is run directly
if (require.main === module) {
  startServer();
  startCleanupJob();
}

module.exports = app;
