const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const {
  createLogger,
  requestLogger,
  globalErrorHandler,
} = require("../../shared/utils");
const customerRoutes = require("./routes/customerRoutes");
const customerController = require("./controllers/customerController");
const { initializeDatabase } = require("../../shared/database");
const { sequelize, Customer, LoyaltyAccount } = require("./models");

// Initialize logger
const logger = createLogger("customer-service");

// Create Express app
const app = express();
const PORT = process.env.PORT || 8081;

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Customer Service API",
      version: "1.0.0",
      description:
        "Customer management and registration service for the digital payment platform",
    },
    servers: [
      {
        url: `http://localhost:${PORT}/api/v1`,
        description: "Development server",
      },
    ],
  },
  apis: ["./src/routes/*.js"],
};

const specs = swaggerJsdoc(swaggerOptions);

// Global middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// Request logging
app.use(requestLogger(logger));

// API documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// Health check endpoint
app.get("/health", customerController.healthCheck);

// API routes
app.use("/api/v1/customers", customerRoutes);

// Global error handler
app.use(globalErrorHandler(logger));

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: "Endpoint not found",
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  });
});

// Seed data
const seedData = {
  Customer: [
    {
      customerId: 1,
      name: "Alice Johnson",
      phone: "+1-555-0001",
      email: "alice.johnson@example.com",
      iban: "GB29NWBK60161331926819",
      status: "ACTIVE",
      loyaltyTier: "GOLD",
      where: { customerId: 1 },
    },
    {
      customerId: 2,
      name: "Bob Smith",
      phone: "+1-555-0002",
      email: "bob.smith@example.com",
      iban: "FR1420041010050500013M02606",
      status: "ACTIVE",
      loyaltyTier: "SILVER",
      where: { customerId: 2 },
    },
    {
      customerId: 3,
      name: "Carol Davis",
      phone: "+1-555-0003",
      email: "carol.davis@example.com",
      iban: "DE89370400440532013000",
      status: "ACTIVE",
      loyaltyTier: "PLATINUM",
      where: { customerId: 3 },
    },
  ],
  LoyaltyAccount: [
    {
      loyaltyId: 1,
      customerId: 1,
      pointsBalance: 2750,
      tier: "GOLD",
      totalPointsEarned: 8500,
      totalPointsRedeemed: 5750,
      where: { customerId: 1 },
    },
    {
      loyaltyId: 2,
      customerId: 2,
      pointsBalance: 1200,
      tier: "SILVER",
      totalPointsEarned: 3200,
      totalPointsRedeemed: 2000,
      where: { customerId: 2 },
    },
    {
      loyaltyId: 3,
      customerId: 3,
      pointsBalance: 5500,
      tier: "PLATINUM",
      totalPointsEarned: 18750,
      totalPointsRedeemed: 13250,
      where: { customerId: 3 },
    },
  ],
};

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database
    await initializeDatabase(sequelize, { Customer, LoyaltyAccount }, seedData);

    // Start server
    app.listen(PORT, () => {
      logger.info(`Customer Service started on port ${PORT}`, {
        port: PORT,
        environment: process.env.NODE_ENV || "development",
        docs: `http://localhost:${PORT}/api-docs`,
      });
    });
  } catch (error) {
    logger.error("Failed to start Customer Service", { error: error.message });
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", { reason, promise });
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await sequelize.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  await sequelize.close();
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;
