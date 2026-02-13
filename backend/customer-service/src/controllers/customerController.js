const customerService = require("../services/customerService");
const {
  asyncHandler,
  HTTP_STATUS,
  createErrorResponse,
  createPaginationResponse,
} = require("../../../shared/utils");

class CustomerController {
  // POST /api/v1/customers - Register new customer
  registerCustomer = asyncHandler(async (req, res) => {
    const customer = await customerService.createCustomer(req.body);

    res.status(HTTP_STATUS.CREATED).json({
      customerId: customer.customerId,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      status: customer.status,
      loyaltyTier: customer.loyaltyAccount?.tier || "SILVER",
      createdAt: customer.createdAt,
      lastUpdatedAt: customer.updatedAt,
    });
  });

  // GET /api/v1/customers - Search customers
  searchCustomers = asyncHandler(async (req, res) => {
    const { query, page, size } = req.query;
    const result = await customerService.searchCustomers(query, page, size);

    const response = createPaginationResponse(
      result.content.map((customer) => ({
        customerId: customer.customerId,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        loyaltyTier: customer.loyaltyTier,
      })),
      page,
      size,
      result.totalElements,
    );

    res.json(response);
  });

  // GET /api/v1/customers/:customerId - Get customer by ID
  getCustomer = asyncHandler(async (req, res) => {
    const { customerId } = req.params;
    const customer = await customerService.getCustomerWithLoyalty(customerId);

    if (!customer) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          createErrorResponse("NOT_FOUND", "Customer not found", [], req.path),
        );
    }

    res.json({
      customerId: customer.customerId,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      status: customer.status,
      loyaltyTier: customer.loyaltyAccount?.tier || customer.loyaltyTier,
      createdAt: customer.createdAt,
      lastUpdatedAt: customer.updatedAt,
    });
  });

  // PUT /api/v1/customers/:customerId - Update customer profile
  updateCustomer = asyncHandler(async (req, res) => {
    const { customerId } = req.params;

    try {
      const customer = await customerService.updateCustomer(
        customerId,
        req.body,
      );

      if (!customer) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(
            createErrorResponse(
              "NOT_FOUND",
              "Customer not found",
              [],
              req.path,
            ),
          );
      }

      res.json({
        customerId: customer.customerId,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        status: customer.status,
        loyaltyTier: customer.loyaltyTier,
        createdAt: customer.createdAt,
        lastUpdatedAt: customer.updatedAt,
      });
    } catch (error) {
      if (error.message.includes("already in use")) {
        return res
          .status(HTTP_STATUS.CONFLICT)
          .json(createErrorResponse("CONFLICT", error.message, [], req.path));
      }
      throw error;
    }
  });

  // PATCH /api/v1/customers/:customerId/status - Update customer status
  updateCustomerStatus = asyncHandler(async (req, res) => {
    const { customerId } = req.params;
    const { status, reason } = req.body;

    const customer = await customerService.updateCustomerStatus(
      customerId,
      status,
      reason,
    );

    if (!customer) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          createErrorResponse("NOT_FOUND", "Customer not found", [], req.path),
        );
    }

    res.json({
      customerId: customer.customerId,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      status: customer.status,
      loyaltyTier: customer.loyaltyTier,
      createdAt: customer.createdAt,
      lastUpdatedAt: customer.updatedAt,
    });
  });

  // GET /api/v1/customers/:customerId/loyalty - Get customer loyalty information
  getCustomerLoyalty = asyncHandler(async (req, res) => {
    const { customerId } = req.params;
    const loyaltyInfo =
      await customerService.getCustomerLoyaltyInfo(customerId);

    if (!loyaltyInfo) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          createErrorResponse("NOT_FOUND", "Customer not found", [], req.path),
        );
    }

    res.json(loyaltyInfo);
  });

  // POST /api/v1/customers/validate/iban - Validate IBAN
  validateIban = asyncHandler(async (req, res) => {
    const { iban } = req.body;
    const validation = await customerService.validateIbanOnly(iban);

    res.json({
      iban: validation.iban,
      valid: validation.valid,
      countryCode: validation.countryCode,
      bankCode: validation.bankCode,
      accountNumber: validation.accountNumber,
    });
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

    const health = createHealthResponse("customer-service", {
      database: dbStatus,
    });

    const status = health.status === "UP" ? HTTP_STATUS.OK : 503;
    res.status(status).json(health);
  });
}

module.exports = new CustomerController();
