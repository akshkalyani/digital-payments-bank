const { DataTypes } = require("sequelize");
const { createModel } = require("../../../shared/database");
const { CUSTOMER_STATUS, LOYALTY_TIER } = require("../../../shared/utils");

const createCustomerModel = (sequelize) => {
  const Customer = createModel(
    sequelize,
    "Customer",
    {
      customerId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "customer_id",
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [2, 100],
        },
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
          is: /^\+[1-9]\d{1,14}$/,
        },
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
          isEmail: true,
        },
      },
      iban: {
        type: DataTypes.STRING(34),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
          is: /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/,
        },
      },
      status: {
        type: DataTypes.ENUM(...Object.values(CUSTOMER_STATUS)),
        allowNull: false,
        defaultValue: CUSTOMER_STATUS.ACTIVE,
      },
      loyaltyTier: {
        type: DataTypes.ENUM(...Object.values(LOYALTY_TIER)),
        allowNull: false,
        defaultValue: LOYALTY_TIER.SILVER,
        field: "loyalty_tier",
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        field: "last_login_at",
      },
    },
    {
      tableName: "customers",
      indexes: [
        {
          unique: true,
          fields: ["phone"],
        },
        {
          unique: true,
          fields: ["email"],
        },
        {
          unique: true,
          fields: ["iban"],
        },
        {
          fields: ["status"],
        },
        {
          fields: ["loyalty_tier"],
        },
      ],
    },
  );

  // Instance methods
  Customer.prototype.updateLastLogin = function () {
    this.lastLoginAt = new Date();
    return this.save();
  };

  Customer.prototype.suspend = function (reason = "") {
    this.status = CUSTOMER_STATUS.SUSPENDED;
    return this.save();
  };

  Customer.prototype.activate = function () {
    this.status = CUSTOMER_STATUS.ACTIVE;
    return this.save();
  };

  Customer.prototype.upgradeTier = function (newTier) {
    if (Object.values(LOYALTY_TIER).includes(newTier)) {
      this.loyaltyTier = newTier;
      return this.save();
    }
    throw new Error("Invalid loyalty tier");
  };

  // Class methods
  Customer.findByPhone = function (phone) {
    return this.findOne({ where: { phone } });
  };

  Customer.findByEmail = function (email) {
    return this.findOne({ where: { email } });
  };

  Customer.findByIban = function (iban) {
    return this.findOne({ where: { iban } });
  };

  Customer.findActiveCustomers = function (options = {}) {
    return this.findAll({
      where: { status: CUSTOMER_STATUS.ACTIVE },
      ...options,
    });
  };

  Customer.searchByQuery = function (query, options = {}) {
    const { Op } = require("sequelize");
    return this.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${query}%` } },
          { email: { [Op.like]: `%${query}%` } },
          { phone: { [Op.like]: `%${query}%` } },
        ],
      },
      ...options,
    });
  };

  return Customer;
};

module.exports = createCustomerModel;
