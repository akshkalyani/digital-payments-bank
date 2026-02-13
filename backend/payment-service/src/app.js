const express = require("express");
const { sequelize } = require("./models");
const routes = require("./routes");
const {
  requestLogger,
  globalErrorHandler,
  createLogger,
} = require("../../shared/utils");

const app = express();
const logger = createLogger("payment-service");
const PORT = process.env.PORT || 8082;

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
    service: "Payment Service",
    version: "1.0.0",
    status: "running",
    timestamp: new Date().toISOString(),
    endpoints: [
      "POST /api/v1/payments - Initiate payment",
      "GET /api/v1/payments - Get customer payments",
      "GET /api/v1/payments/:paymentId - Get payment details",
      "PATCH /api/v1/payments/:paymentId - Update payment status",
      "POST /api/v1/payments/:paymentId/cancel - Cancel payment",
      "POST /api/v1/payments/qr - Process QR payment",
      "POST /api/v1/payments/retry/:paymentId - Retry failed payment",
      "GET /api/v1/health - Health check",
    ],
  });
});

// Swagger documentation (simplified)
app.get("/api-docs", (req, res) => {
  const swaggerSpec = {
    openapi: "3.0.0",
    info: {
      title: "Payment Service API",
      version: "1.0.0",
      description: "Payment processing microservice",
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server",
      },
    ],
    paths: {
      "/api/v1/payments": {
        post: {
          summary: "Initiate payment",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: [
                    "senderId",
                    "recipientId",
                    "recipientType",
                    "amount",
                    "currency",
                    "method",
                  ],
                  properties: {
                    senderId: { type: "integer", example: 1 },
                    recipientId: { type: "integer", example: 2 },
                    recipientType: {
                      type: "string",
                      enum: ["CUSTOMER", "MERCHANT"],
                    },
                    amount: { type: "number", example: 100.5 },
                    currency: { type: "string", example: "USD" },
                    method: {
                      type: "string",
                      enum: ["BANK_TRANSFER", "QR_CODE", "DIRECT"],
                    },
                    description: {
                      type: "string",
                      example: "Payment for services",
                    },
                    loyaltyRedemption: {
                      type: "object",
                      properties: {
                        points: { type: "integer", example: 100 },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Payment initiated successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      paymentId: { type: "string", format: "uuid" },
                      senderId: { type: "integer" },
                      recipientId: { type: "integer" },
                      amount: { type: "number" },
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
          summary: "Get customer payments",
          parameters: [
            {
              name: "customerId",
              in: "query",
              required: true,
              schema: { type: "integer" },
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
            200: { description: "Payments retrieved successfully" },
          },
        },
      },
      "/api/v1/payments/{paymentId}": {
        get: {
          summary: "Get payment details",
          parameters: [
            {
              name: "paymentId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: { description: "Payment details retrieved" },
            404: { description: "Payment not found" },
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
      logger.info(`Payment Service started on port ${PORT}`);
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
}

module.exports = app;
