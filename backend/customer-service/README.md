# Customer Service

Customer management and registration microservice for the Digital Payment Platform.

## Features

- Customer registration with IBAN validation
- Customer profile management
- Customer status management (Admin only)
- Loyalty program integration
- Customer search and pagination
- IBAN validation utility

## API Endpoints

### Customer Management

- `POST /api/v1/customers` - Register new customer
- `GET /api/v1/customers` - Search customers (with pagination)
- `GET /api/v1/customers/{customerId}` - Get customer details
- `PUT /api/v1/customers/{customerId}` - Update customer profile
- `PATCH /api/v1/customers/{customerId}/status` - Update customer status (Admin)

### Loyalty Integration

- `GET /api/v1/customers/{customerId}/loyalty` - Get loyalty information

### Utilities

- `POST /api/v1/customers/validate/iban` - Validate IBAN format

### Health & Documentation

- `GET /health` - Health check
- `GET /api-docs` - Swagger API documentation

## Running the Service

### Development

```bash
npm install
npm run dev
```

### Production

```bash
npm install --production
npm start
```

## Environment Variables

- `NODE_ENV` - Environment (development, production, test)
- `PORT` - Service port (default: 8081)

## Database

Uses SQLite database with Sequelize ORM:

- Database file: `data/customer-service.sqlite`
- Auto-creates tables on startup
- Seeds sample data in development

## Models

### Customer

- Customer registration and profile data
- IBAN validation and storage
- Status management (ACTIVE, INACTIVE, SUSPENDED)
- Loyalty tier tracking

### LoyaltyAccount

- Points balance and tier management
- Points earning and redemption tracking
- Automatic tier progression logic

## Validation

Comprehensive input validation using Joi:

- IBAN format validation with checksum
- International phone number validation
- Email format validation
- Required field validation

## Logging

Structured JSON logging with Winston:

- Request/response logging
- Error tracking with correlation IDs
- Performance monitoring

## Testing

```bash
npm test
```

## Architecture

Follows clean architecture principles:

- Controllers: Request/response handling
- Services: Business logic
- Models: Data models and database interaction
- Middleware: Validation, authentication, logging
- Routes: API endpoint definitions

## Security Features

- Helmet.js security headers
- Rate limiting (100 req/15min per IP)
- Input sanitization and validation
- CORS enabled for cross-origin requests

## Dependencies

### Production

- `express` - Web framework
- `sequelize` - ORM
- `sqlite3` - Database
- `joi` - Validation
- `winston` - Logging
- `cors` - Cross-origin support
- `helmet` - Security headers
- `express-rate-limit` - Rate limiting

### Development

- `nodemon` - Auto-restart in development
- `jest` - Testing framework
- `supertest` - HTTP testing
