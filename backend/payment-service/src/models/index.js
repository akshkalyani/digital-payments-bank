const { createDatabase } = require("../../../shared/database");
const createPaymentModel = require("./Payment");

// Create database connection
const sequelize = createDatabase("payment-service");

// Create models
const Payment = createPaymentModel(sequelize);

// Export models and database
module.exports = {
  sequelize,
  Payment,
};
