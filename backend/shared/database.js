const { Sequelize, DataTypes } = require("sequelize");

// Database configuration factory
const createDatabase = (serviceName, options = {}) => {
  const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: `./data/${serviceName}.sqlite`,
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    ...options,
  });

  return sequelize;
};

// Common model fields
const commonFields = {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
};

// Base model class with common methods
class BaseModel {
  static addHooks(model) {
    model.beforeUpdate((instance) => {
      instance.updatedAt = new Date();
    });
  }

  static addCommonMethods(model) {
    model.prototype.toJSON = function () {
      const values = { ...this.get() };
      // Remove sensitive fields if they exist
      delete values.password;
      delete values.apiKey;
      return values;
    };
  }
}

// Model factory for consistent model creation
const createModel = (sequelize, modelName, attributes, options = {}) => {
  const model = sequelize.define(
    modelName,
    {
      ...commonFields,
      ...attributes,
    },
    {
      timestamps: true,
      underscored: false,
      ...options,
    },
  );

  BaseModel.addHooks(model);
  BaseModel.addCommonMethods(model);

  return model;
};

// Database initialization and seeding
const initializeDatabase = async (sequelize, models = {}, seedData = {}) => {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log("Database connection established successfully.");

    // Sync models
    await sequelize.sync({ force: process.env.NODE_ENV === "test" });
    console.log("Database synchronized.");

    // Seed data in development/test environment
    if (
      process.env.NODE_ENV !== "production" &&
      Object.keys(seedData).length > 0
    ) {
      await seedDatabase(models, seedData);
      console.log("Database seeded successfully.");
    }

    return true;
  } catch (error) {
    console.error("Unable to connect to database:", error);
    throw error;
  }
};

// Generic seeding function
const seedDatabase = async (models, seedData) => {
  for (const [modelName, data] of Object.entries(seedData)) {
    const model = models[modelName];
    if (model) {
      for (const item of data) {
        await model.findOrCreate({
          where: item.where || { id: item.id },
          defaults: item,
        });
      }
    }
  }
};

// Transaction wrapper
const withTransaction = (sequelize) => async (callback) => {
  const transaction = await sequelize.transaction();

  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// Generic repository pattern
class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async create(data, transaction = null) {
    return await this.model.create(data, { transaction });
  }

  async findById(id, options = {}) {
    return await this.model.findByPk(id, options);
  }

  async findOne(where, options = {}) {
    return await this.model.findOne({ where, ...options });
  }

  async findAll(options = {}) {
    return await this.model.findAll(options);
  }

  async findAndCountAll(options = {}) {
    return await this.model.findAndCountAll(options);
  }

  async update(id, data, transaction = null) {
    const [updatedRowsCount] = await this.model.update(data, {
      where: { id },
      transaction,
    });

    if (updatedRowsCount === 0) {
      return null;
    }

    return await this.findById(id);
  }

  async delete(id, transaction = null) {
    const deletedRowsCount = await this.model.destroy({
      where: { id },
      transaction,
    });

    return deletedRowsCount > 0;
  }

  async count(where = {}) {
    return await this.model.count({ where });
  }

  async exists(where) {
    const count = await this.model.count({ where, limit: 1 });
    return count > 0;
  }
}

// Pagination helper
const paginate = (page = 0, size = 20) => {
  const limit = Math.min(parseInt(size), 100); // Max 100 items per page
  const offset = parseInt(page) * limit;

  return { limit, offset };
};

// Search helper for text fields
const createSearchCondition = (query, fields) => {
  if (!query) return {};

  const { Op } = require("sequelize");

  return {
    [Op.or]: fields.map((field) => ({
      [field]: {
        [Op.like]: `%${query}%`,
      },
    })),
  };
};

module.exports = {
  createDatabase,
  createModel,
  commonFields,
  BaseModel,
  BaseRepository,
  initializeDatabase,
  seedDatabase,
  withTransaction,
  paginate,
  createSearchCondition,
};
