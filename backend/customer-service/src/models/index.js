const { createDatabase } = require("../../../shared/database");
const createCustomerModel = require("./Customer");
const createLoyaltyAccountModel = require("./LoyaltyAccount");

// Create database connection
const sequelize = createDatabase("customer-service");

// Create models
const Customer = createCustomerModel(sequelize);
const LoyaltyAccount = createLoyaltyAccountModel(sequelize);

// Define associations
Customer.hasOne(LoyaltyAccount, {
  foreignKey: "customerId",
  as: "loyaltyAccount",
});

LoyaltyAccount.belongsTo(Customer, {
  foreignKey: "customerId",
  as: "customer",
});

// Export models and database
module.exports = {
  sequelize,
  Customer,
  LoyaltyAccount,
};
