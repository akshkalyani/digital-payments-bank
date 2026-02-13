const Joi = require("joi");

// Customer registration validation schema
const customerRegistrationSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    "string.base": "Name must be a string",
    "string.empty": "Name is required",
    "string.min": "Name must be at least 2 characters long",
    "string.max": "Name must not exceed 100 characters",
    "any.required": "Name is required",
  }),

  phone: Joi.string()
    .pattern(/^\+[1-9]\d{1,14}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Phone number must be in international format (e.g., +1-555-0123)",
      "any.required": "Phone number is required",
    }),

  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),

  iban: Joi.string()
    .pattern(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/)
    .required()
    .messages({
      "string.pattern.base":
        "IBAN must be a valid international bank account number",
      "any.required": "IBAN is required",
    }),
});

// Customer update validation schema
const customerUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional().messages({
    "string.base": "Name must be a string",
    "string.min": "Name must be at least 2 characters long",
    "string.max": "Name must not exceed 100 characters",
  }),

  email: Joi.string().email().optional().messages({
    "string.email": "Please provide a valid email address",
  }),
});

// Customer status update validation schema
const customerStatusUpdateSchema = Joi.object({
  status: Joi.string()
    .valid("ACTIVE", "INACTIVE", "SUSPENDED")
    .required()
    .messages({
      "any.only": "Status must be one of: ACTIVE, INACTIVE, SUSPENDED",
      "any.required": "Status is required",
    }),

  reason: Joi.string().max(500).required().messages({
    "string.max": "Reason must not exceed 500 characters",
    "any.required": "Reason is required",
  }),
});

// IBAN validation schema
const ibanValidationSchema = Joi.object({
  iban: Joi.string()
    .pattern(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/)
    .required()
    .messages({
      "string.pattern.base": "IBAN must be a valid format",
      "any.required": "IBAN is required",
    }),
});

// Search query validation schema
const searchQuerySchema = Joi.object({
  query: Joi.string().trim().min(1).max(100).optional().messages({
    "string.min": "Search query must be at least 1 character long",
    "string.max": "Search query must not exceed 100 characters",
  }),

  page: Joi.number().integer().min(0).default(0).messages({
    "number.base": "Page must be a number",
    "number.integer": "Page must be an integer",
    "number.min": "Page must be 0 or greater",
  }),

  size: Joi.number().integer().min(1).max(100).default(20).messages({
    "number.base": "Size must be a number",
    "number.integer": "Size must be an integer",
    "number.min": "Size must be at least 1",
    "number.max": "Size must not exceed 100",
  }),
});

// Validation middleware factory
const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((detail) => detail.message);
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Invalid input data",
        details,
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }

    req[property] = value;
    next();
  };
};

module.exports = {
  customerRegistrationSchema,
  customerUpdateSchema,
  customerStatusUpdateSchema,
  ibanValidationSchema,
  searchQuerySchema,
  validate,
};
