# System Actors

## Primary Actors

### 1. Customer

**Description**: Individual users who register for the payment application to send and receive payments.

**Characteristics**:

- Individual person with valid phone number and IBAN
- Automatically enrolled in loyalty program upon registration
- Can rate merchants after transactions
- Receives notifications and email receipts

**Responsibilities**:

- Register and maintain profile information
- Initiate payments (QR-based or manual)
- Receive payments from other customers or merchants
- Rate merchant services
- Manage loyalty points and tier benefits
- View transaction history

**System Interactions**:

- Registration and profile management
- Payment initiation and authorization
- QR code scanning and generation
- Transaction history viewing
- Merchant rating and feedback
- Loyalty program participation

### 2. Merchant

**Description**: Business entities that accept payments from customers through the platform.

**Characteristics**:

- Business entity with valid business registration
- Requires approval by authorized personnel
- Can have multiple payment methods and preferences
- Subject to customer ratings and feedback

**Responsibilities**:

- Provide business information for onboarding
- Accept payments from customers
- Maintain business profile and payment preferences
- Respond to customer feedback and ratings
- Monitor transaction history and reconciliation

**System Interactions**:

- Merchant onboarding process
- Payment acceptance and processing
- Transaction monitoring and reporting
- Profile and preference management
- Customer rating and feedback review

### 3. Authorized Personnel

**Description**: Staff members responsible for merchant management and system administration.

**Characteristics**:

- Internal staff with administrative privileges
- Responsible for merchant onboarding and verification
- Can manage merchant status and approvals
- Access to merchant management dashboards

**Responsibilities**:

- Review and approve merchant onboarding requests
- Verify merchant business information
- Manage merchant status (active, inactive, suspended)
- Monitor merchant compliance and performance
- Handle merchant-related issues and disputes

**System Interactions**:

- Merchant onboarding workflow management
- Merchant verification and approval processes
- Merchant status and profile management
- Merchant performance monitoring
- System administration tasks

### 4. System Administrator

**Description**: Technical and business administrators with full system access.

**Characteristics**:

- Technical staff with system administration privileges
- Responsible for system configuration and maintenance
- Can manage cashback programs and loyalty tiers
- Access to all system dashboards and reports

**Responsibilities**:

- Configure cashback programs for specific bank cards
- Manage loyalty program tiers and benefits
- Monitor fraud detection rules and alerts
- System configuration and maintenance
- User account management and support

**System Interactions**:

- Cashback program configuration and management
- Loyalty program administration
- Fraud detection rule management
- System configuration and monitoring
- User support and account management

## Secondary Actors

### 5. Bank Systems

**Description**: External banking systems that process actual payment transactions.

**Characteristics**:

- Third-party financial institutions
- Integrated via stubbed adapters
- Provide payment processing capabilities
- Subject to financial regulations and compliance

**Responsibilities**:

- Process payment transactions
- Validate account information
- Provide transaction confirmations
- Handle payment failures and exceptions

**System Interactions**:

- Payment processing requests
- Account validation services
- Transaction status updates
- Payment confirmation and reconciliation

### 6. Wallet Systems

**Description**: Digital wallet providers integrated with the platform.

**Characteristics**:

- Third-party digital payment providers
- Integrated via adapter pattern
- Support various payment methods
- Provide alternative payment channels

**Responsibilities**:

- Process wallet-based payments
- Maintain wallet account information
- Provide payment confirmations
- Handle wallet-specific transactions

**System Interactions**:

- Wallet payment processing
- Account balance inquiries
- Transaction confirmations
- Payment method validation

### 7. POS Systems

**Description**: Point-of-sale systems used by merchants for in-store payments.

**Characteristics**:

- Physical or software-based POS terminals
- Integrated with merchant payment systems
- Support QR code and manual payment methods
- Provide real-time transaction processing

**Responsibilities**:

- Process in-store payment transactions
- Generate and display QR codes
- Handle payment confirmations
- Provide transaction receipts

**System Interactions**:

- POS payment processing
- QR code generation and display
- Transaction status updates
- Payment confirmation handling

## System Actors

### 8. Fraud Detection System

**Description**: Automated system that monitors transactions for fraudulent activities.

**Characteristics**:

- Rule-based detection engine
- Real-time transaction monitoring
- Configurable fraud detection rules
- Automated alert generation

**Responsibilities**:

- Monitor all payment transactions in real-time
- Apply fraud detection rules and scoring
- Generate fraud alerts and notifications
- Flag suspicious transactions for review
- Maintain fraud detection history and patterns

**System Interactions**:

- Transaction monitoring and analysis
- Fraud rule evaluation and scoring
- Alert generation and notification
- Integration with payment processing workflow

### 9. Notification System

**Description**: Internal system component responsible for multi-channel communications.

**Characteristics**:

- Multi-channel communication support (email, SMS, push)
- Template-based message generation
- Delivery tracking and confirmation
- Integration with external communication providers

**Responsibilities**:

- Send transaction confirmations and receipts
- Deliver system alerts and notifications
- Handle promotional and loyalty communications
- Manage communication preferences and delivery

**System Interactions**:

- Message generation and formatting
- Multi-channel delivery coordination
- Delivery status tracking and reporting
- Integration with email and SMS providers

## Actor Relationships

### Customer ↔ Merchant

- Customers make payments to merchants
- Merchants accept payments from customers
- Customers rate merchants after transactions
- Merchants can view customer ratings and feedback

### Customer ↔ Authorized Personnel

- Indirect relationship through merchant management
- Authorized personnel ensure merchant quality for customer experience

### Authorized Personnel ↔ System Administrator

- Both have administrative roles with different scopes
- Authorized personnel focus on merchant management
- System administrators handle technical and program configuration

### All Users ↔ System Actors

- All user actors interact with fraud detection system through transaction monitoring
- All user actors receive communications through notification system
- All payment actors integrate with external systems through adapter patterns

## Access Control Matrix

| Actor                | Customer Service | Merchant Service | Payment Service  | Fraud Service    | Loyalty Service  | Cashback Service |
| -------------------- | ---------------- | ---------------- | ---------------- | ---------------- | ---------------- | ---------------- |
| Customer             | Full Access      | Read Only        | Full Access      | No Direct Access | Full Access      | No Direct Access |
| Merchant             | No Direct Access | Full Access      | Full Access      | No Direct Access | No Direct Access | No Direct Access |
| Authorized Personnel | Read Only        | Full Access      | Read Only        | Read Only        | No Direct Access | No Direct Access |
| System Administrator | Full Access      | Full Access      | Read Only        | Full Access      | Full Access      | Full Access      |
| External Systems     | No Direct Access | No Direct Access | Integration Only | No Direct Access | No Direct Access | No Direct Access |
