const express = require("express");
const customerController = require("../controllers/customerController");
const {
  validate,
  customerRegistrationSchema,
  customerUpdateSchema,
  customerStatusUpdateSchema,
  ibanValidationSchema,
  searchQuerySchema,
} = require("../middleware/validation");

const router = express.Router();

/**
 * @swagger
 * /api/v1/customers:
 *   post:
 *     summary: Register new customer
 *     tags: [Customers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *               - email
 *               - iban
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               phone:
 *                 type: string
 *                 example: "+1-555-0123"
 *               email:
 *                 type: string
 *                 example: "john.doe@example.com"
 *               iban:
 *                 type: string
 *                 example: "GB29NWBK60161331926819"
 *     responses:
 *       201:
 *         description: Customer registered successfully
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: Customer already exists
 */
router.post(
  "/",
  validate(customerRegistrationSchema),
  customerController.registerCustomer,
);

/**
 * @swagger
 * /api/v1/customers:
 *   get:
 *     summary: Search customers
 *     tags: [Customers]
 *     parameters:
 *       - name: query
 *         in: query
 *         schema:
 *           type: string
 *         description: Search query
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 0
 *       - name: size
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Customer search results
 */
router.get(
  "/",
  validate(searchQuerySchema, "query"),
  customerController.searchCustomers,
);

/**
 * @swagger
 * /api/v1/customers/{customerId}:
 *   get:
 *     summary: Get customer by ID
 *     tags: [Customers]
 *     parameters:
 *       - name: customerId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Customer details
 *       404:
 *         description: Customer not found
 */
router.get("/:customerId", customerController.getCustomer);

/**
 * @swagger
 * /api/v1/customers/{customerId}:
 *   put:
 *     summary: Update customer profile
 *     tags: [Customers]
 *     parameters:
 *       - name: customerId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *       404:
 *         description: Customer not found
 */
router.put(
  "/:customerId",
  validate(customerUpdateSchema),
  customerController.updateCustomer,
);

/**
 * @swagger
 * /api/v1/customers/{customerId}/status:
 *   patch:
 *     summary: Update customer status
 *     tags: [Customers]
 *     parameters:
 *       - name: customerId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *               - reason
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE, SUSPENDED]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Customer status updated
 *       404:
 *         description: Customer not found
 */
router.patch(
  "/:customerId/status",
  validate(customerStatusUpdateSchema),
  customerController.updateCustomerStatus,
);

/**
 * @swagger
 * /api/v1/customers/{customerId}/loyalty:
 *   get:
 *     summary: Get customer loyalty information
 *     tags: [Loyalty]
 *     parameters:
 *       - name: customerId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Customer loyalty information
 *       404:
 *         description: Customer not found
 */
router.get("/:customerId/loyalty", customerController.getCustomerLoyalty);

/**
 * @swagger
 * /api/v1/customers/validate/iban:
 *   post:
 *     summary: Validate IBAN
 *     tags: [Customers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - iban
 *             properties:
 *               iban:
 *                 type: string
 *                 example: "GB29NWBK60161331926819"
 *     responses:
 *       200:
 *         description: IBAN validation result
 */
router.post(
  "/validate/iban",
  validate(ibanValidationSchema),
  customerController.validateIban,
);

module.exports = router;
