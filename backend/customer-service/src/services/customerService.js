const { BaseRepository } = require("../../../shared/database");
const { Customer, LoyaltyAccount } = require("../models");
const { validateIban } = require("../../../shared/utils");

class CustomerService extends BaseRepository {
  constructor() {
    super(Customer);
  }

  async createCustomer(customerData) {
    // Validate IBAN
    const ibanValidation = validateIban(customerData.iban);
    if (!ibanValidation.valid) {
      throw new Error(`Invalid IBAN: ${ibanValidation.error}`);
    }

    // Check for existing customer
    const existingCustomer = await this.findExistingCustomer(customerData);
    if (existingCustomer) {
      throw new Error(
        "Customer already exists with provided phone, email, or IBAN",
      );
    }

    // Create customer and loyalty account in transaction
    const { sequelize } = require("../models");
    const transaction = await sequelize.transaction();

    try {
      // Create customer with validated IBAN
      const customer = await Customer.create(
        {
          ...customerData,
          iban: ibanValidation.iban,
        },
        { transaction },
      );

      // Auto-create loyalty account
      const loyaltyAccount = await LoyaltyAccount.create(
        {
          customerId: customer.customerId,
          pointsBalance: 0,
          tier: "SILVER",
        },
        { transaction },
      );

      await transaction.commit();

      // Return customer with loyalty account
      return await this.getCustomerWithLoyalty(customer.customerId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async updateCustomer(customerId, updateData) {
    const customer = await this.findById(customerId);
    if (!customer) {
      return null;
    }

    // Check for email uniqueness if email is being updated
    if (updateData.email && updateData.email !== customer.email) {
      const existingCustomer = await Customer.findByEmail(updateData.email);
      if (existingCustomer && existingCustomer.customerId !== customerId) {
        throw new Error("Email already in use by another customer");
      }
    }

    return await customer.update(updateData);
  }

  async updateCustomerStatus(customerId, status, reason) {
    const customer = await this.findById(customerId);
    if (!customer) {
      return null;
    }

    await customer.update({ status });

    // Log status change
    console.log(
      `Customer ${customerId} status changed to ${status}. Reason: ${reason}`,
    );

    return customer;
  }

  async searchCustomers(query, page = 0, size = 20) {
    const offset = page * size;
    const limit = Math.min(size, 100);

    if (query) {
      const { count, rows } = await Customer.searchByQuery(query, {
        offset,
        limit,
        order: [["name", "ASC"]],
      });

      return {
        content: rows,
        totalElements: count,
        totalPages: Math.ceil(count / size),
        size,
        number: page,
      };
    } else {
      const { count, rows } = await Customer.findAndCountAll({
        offset,
        limit,
        order: [["name", "ASC"]],
      });

      return {
        content: rows,
        totalElements: count,
        totalPages: Math.ceil(count / size),
        size,
        number: page,
      };
    }
  }

  async getCustomerWithLoyalty(customerId) {
    return await Customer.findByPk(customerId, {
      include: [
        {
          model: LoyaltyAccount,
          as: "loyaltyAccount",
        },
      ],
    });
  }

  async getCustomerLoyaltyInfo(customerId) {
    const customer = await this.getCustomerWithLoyalty(customerId);
    if (!customer) {
      return null;
    }

    const loyaltyAccount = customer.loyaltyAccount;
    if (!loyaltyAccount) {
      return null;
    }

    const tierProgress = loyaltyAccount.getTierProgress();

    // Get monthly progress (simplified - using last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    // In a real system, you'd query transaction history here
    const monthlyProgress = {
      pointsThisMonth: 0, // Would be calculated from transactions
      transactionsThisMonth: 0, // Would be calculated from transactions
      tierUpgradeEligible: false,
    };

    return {
      customerId: customer.customerId,
      tier: loyaltyAccount.tier,
      pointsBalance: loyaltyAccount.pointsBalance,
      tierProgress,
      monthlyProgress,
    };
  }

  async validateIbanOnly(iban) {
    return validateIban(iban);
  }

  // Private helper methods
  async findExistingCustomer(customerData) {
    const { Op } = require("sequelize");

    return await Customer.findOne({
      where: {
        [Op.or]: [
          { phone: customerData.phone },
          { email: customerData.email },
          { iban: customerData.iban },
        ],
      },
    });
  }

  async getActiveCustomersCount() {
    return await Customer.count({
      where: { status: "ACTIVE" },
    });
  }

  async getCustomersByTier(tier) {
    return await Customer.findAll({
      include: [
        {
          model: LoyaltyAccount,
          as: "loyaltyAccount",
          where: { tier },
        },
      ],
    });
  }
}

module.exports = new CustomerService();
