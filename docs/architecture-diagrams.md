# System Architecture Diagrams

## Class Diagram

```mermaid
classDiagram
    %% Customer Domain
    class Customer {
        -Long customerId
        -String name
        -String phone
        -String iban
        -String email
        -LocalDateTime createdAt
        -CustomerStatus status
        -LoyaltyTier loyaltyTier
        +register()
        +updateProfile()
        +validateIban()
    }

    class LoyaltyAccount {
        -Long loyaltyId
        -Long customerId
        -Integer pointsBalance
        -LoyaltyTier tier
        -LocalDateTime lastUpdated
        +addPoints(amount)
        +redeemPoints(amount)
        +checkTierEligibility()
    }

    %% Merchant Domain
    class Merchant {
        -Long merchantId
        -String businessName
        -String contactEmail
        -String phone
        -String businessIban
        -MerchantStatus status
        -Double averageRating
        -Integer totalRatings
        +updateProfile()
        +calculateAverageRating()
    }

    class MerchantRating {
        -Long ratingId
        -Long merchantId
        -Long customerId
        -Integer rating
        -String comment
        -LocalDateTime createdAt
        +submitRating()
        +validateRating()
    }

    %% Payment Domain
    class Payment {
        -Long paymentId
        -Long senderId
        -Long recipientId
        -BigDecimal amount
        -String currency
        -PaymentMethod method
        -PaymentStatus status
        -String description
        -LocalDateTime createdAt
        -String bankTransactionId
        +initiate()
        +process()
        +cancel()
        +refund()
    }

    class QRCode {
        -Long qrId
        -String qrData
        -Long merchantId
        -BigDecimal amount
        -LocalDateTime expiresAt
        -QRStatus status
        +generate()
        +validate()
        +expire()
    }

    %% Transaction Domain
    class Transaction {
        -Long transactionId
        -Long paymentId
        -Long senderId
        -Long recipientId
        -BigDecimal amount
        -TransactionType type
        -TransactionStatus status
        -LocalDateTime timestamp
        -String auditTrail
        +record()
        +updateStatus()
        +generateAuditLog()
    }

    %% Fraud Domain
    class FraudAnalysis {
        -Long analysisId
        -Long paymentId
        -Integer riskScore
        -FraudStatus status
        -String rules_applied
        -LocalDateTime analyzedAt
        -String notes
        +analyzeTransaction()
        +calculateRiskScore()
        +flagSuspicious()
    }

    class FraudRule {
        -Long ruleId
        -String ruleName
        -String condition
        -Integer points
        -Boolean active
        -LocalDateTime createdAt
        +evaluate(payment)
        +activate()
        +deactivate()
    }

    %% Notification Domain
    class Notification {
        -Long notificationId
        -Long userId
        -NotificationType type
        -String subject
        -String content
        -NotificationChannel channel
        -NotificationStatus status
        -LocalDateTime sentAt
        +send()
        +markAsRead()
        +retry()
    }

    %% Cashback Domain
    class CashbackProgram {
        -Long programId
        -String bankName
        -String cardType
        -BigDecimal cashbackRate
        -Boolean active
        -LocalDateTime validFrom
        -LocalDateTime validTo
        +calculateCashback()
        +isEligible()
        +activate()
    }

    class CashbackTransaction {
        -Long cashbackId
        -Long paymentId
        -Long programId
        -BigDecimal amount
        -CashbackStatus status
        -LocalDateTime processedAt
        +process()
        +reverse()
    }

    %% Bank Integration Domain
    class BankAdapter {
        -String bankName
        -String apiEndpoint
        -Boolean active
        +processPayment(payment)
        +validateAccount(iban)
        +checkBalance(account)
    }

    %% Enums
    class CustomerStatus {
        <<enumeration>>
        ACTIVE
        INACTIVE
        SUSPENDED
    }

    class LoyaltyTier {
        <<enumeration>>
        SILVER
        GOLD
        PLATINUM
    }

    class PaymentStatus {
        <<enumeration>>
        PENDING
        PROCESSING
        COMPLETED
        FAILED
        CANCELLED
    }

    class PaymentMethod {
        <<enumeration>>
        QR_CODE
        MANUAL
        BANK_TRANSFER
    }

    class FraudStatus {
        <<enumeration>>
        CLEAR
        SUSPICIOUS
        BLOCKED
        UNDER_REVIEW
    }

    class NotificationType {
        <<enumeration>>
        PAYMENT_CONFIRMATION
        EMAIL_RECEIPT
        FRAUD_ALERT
        LOYALTY_UPDATE
        TIER_UPGRADE
    }

    %% Relationships
    Customer ||--o{ Payment : "sends/receives"
    Customer ||--|| LoyaltyAccount : "has"
    Customer ||--o{ MerchantRating : "gives"

    Merchant ||--o{ Payment : "receives"
    Merchant ||--o{ QRCode : "generates"
    Merchant ||--o{ MerchantRating : "receives"

    Payment ||--|| Transaction : "creates"
    Payment ||--o| FraudAnalysis : "analyzed by"
    Payment ||--o{ Notification : "triggers"
    Payment ||--o| CashbackTransaction : "eligible for"

    QRCode ||--o| Payment : "initiates"

    FraudRule ||--o{ FraudAnalysis : "applied in"

    CashbackProgram ||--o{ CashbackTransaction : "applies to"

    Customer ||--o{ Notification : "receives"
    Merchant ||--o{ Notification : "receives"
```

## Entity Relationship Diagram

```mermaid
erDiagram
    CUSTOMERS {
        bigint customer_id PK
        varchar name
        varchar phone UK
        varchar iban UK
        varchar email UK
        timestamp created_at
        varchar status
        varchar loyalty_tier
    }

    MERCHANTS {
        bigint merchant_id PK
        varchar business_name
        varchar contact_email UK
        varchar phone
        varchar business_iban UK
        varchar status
        decimal average_rating
        integer total_ratings
        timestamp created_at
    }

    PAYMENTS {
        bigint payment_id PK
        bigint sender_id FK
        bigint recipient_id FK
        decimal amount
        varchar currency
        varchar method
        varchar status
        varchar description
        timestamp created_at
        varchar bank_transaction_id UK
    }

    TRANSACTIONS {
        bigint transaction_id PK
        bigint payment_id FK
        bigint sender_id FK
        bigint recipient_id FK
        decimal amount
        varchar type
        varchar status
        timestamp timestamp
        text audit_trail
    }

    QR_CODES {
        bigint qr_id PK
        varchar qr_data UK
        bigint merchant_id FK
        decimal amount
        timestamp expires_at
        varchar status
        timestamp created_at
    }

    LOYALTY_ACCOUNTS {
        bigint loyalty_id PK
        bigint customer_id FK
        integer points_balance
        varchar tier
        timestamp last_updated
    }

    LOYALTY_TRANSACTIONS {
        bigint loyalty_transaction_id PK
        bigint customer_id FK
        bigint payment_id FK
        integer points_earned
        integer points_redeemed
        varchar tier_before
        varchar tier_after
        timestamp created_at
    }

    MERCHANT_RATINGS {
        bigint rating_id PK
        bigint merchant_id FK
        bigint customer_id FK
        integer rating
        varchar comment
        timestamp created_at
    }

    FRAUD_ANALYSES {
        bigint analysis_id PK
        bigint payment_id FK
        integer risk_score
        varchar status
        varchar rules_applied
        timestamp analyzed_at
        text notes
    }

    FRAUD_RULES {
        bigint rule_id PK
        varchar rule_name UK
        varchar condition
        integer points
        boolean active
        timestamp created_at
    }

    NOTIFICATIONS {
        bigint notification_id PK
        bigint user_id FK
        varchar user_type
        varchar type
        varchar subject
        text content
        varchar channel
        varchar status
        timestamp sent_at
    }

    CASHBACK_PROGRAMS {
        bigint program_id PK
        varchar bank_name
        varchar card_type
        decimal cashback_rate
        boolean active
        timestamp valid_from
        timestamp valid_to
    }

    CASHBACK_TRANSACTIONS {
        bigint cashback_id PK
        bigint payment_id FK
        bigint program_id FK
        decimal amount
        varchar status
        timestamp processed_at
    }

    BANK_CONFIGURATIONS {
        bigint config_id PK
        varchar bank_name UK
        varchar api_endpoint
        varchar api_key_reference
        boolean active
        timestamp created_at
    }

    %% Relationships
    CUSTOMERS ||--o{ PAYMENTS : "sender_id"
    CUSTOMERS ||--o{ PAYMENTS : "recipient_id"
    CUSTOMERS ||--|| LOYALTY_ACCOUNTS : "customer_id"
    CUSTOMERS ||--o{ MERCHANT_RATINGS : "customer_id"
    CUSTOMERS ||--o{ LOYALTY_TRANSACTIONS : "customer_id"
    CUSTOMERS ||--o{ NOTIFICATIONS : "user_id"

    MERCHANTS ||--o{ PAYMENTS : "recipient_id"
    MERCHANTS ||--o{ QR_CODES : "merchant_id"
    MERCHANTS ||--o{ MERCHANT_RATINGS : "merchant_id"
    MERCHANTS ||--o{ NOTIFICATIONS : "user_id"

    PAYMENTS ||--|| TRANSACTIONS : "payment_id"
    PAYMENTS ||--o| FRAUD_ANALYSES : "payment_id"
    PAYMENTS ||--o{ LOYALTY_TRANSACTIONS : "payment_id"
    PAYMENTS ||--o| CASHBACK_TRANSACTIONS : "payment_id"

    QR_CODES ||--o| PAYMENTS : "qr_code_id"

    CASHBACK_PROGRAMS ||--o{ CASHBACK_TRANSACTIONS : "program_id"
```

## State Diagram - Payment Lifecycle

```mermaid
stateDiagram-v2
    [*] --> INITIATED : Customer starts payment

    INITIATED --> VALIDATING : Submit payment details
    VALIDATING --> FRAUD_CHECK : Basic validation passed
    VALIDATING --> FAILED : Validation failed

    FRAUD_CHECK --> PROCESSING : Low risk (auto-approve)
    FRAUD_CHECK --> MANUAL_REVIEW : Medium risk
    FRAUD_CHECK --> BLOCKED : High risk

    MANUAL_REVIEW --> PROCESSING : Approved by admin
    MANUAL_REVIEW --> BLOCKED : Rejected by admin

    PROCESSING --> BANK_PENDING : Submit to bank
    BANK_PENDING --> COMPLETED : Bank confirms
    BANK_PENDING --> FAILED : Bank rejects
    BANK_PENDING --> TIMEOUT : Bank timeout

    TIMEOUT --> FAILED : Retry limit exceeded
    TIMEOUT --> PROCESSING : Retry attempt

    COMPLETED --> NOTIFYING : Send notifications
    NOTIFYING --> SUCCESS : All notifications sent

    FAILED --> [*] : End state
    BLOCKED --> [*] : End state
    SUCCESS --> [*] : End state

    note right of FRAUD_CHECK
        Risk scoring:
        - Amount thresholds
        - Frequency patterns
        - Account age
        - Geographic anomalies
    end note

    note right of PROCESSING
        Bank integration:
        - Account validation
        - Balance verification
        - Transaction execution
    end note
```

## Activity Diagram - Payment Flow

```mermaid
flowchart TD
    Start([Customer initiates payment])

    Start --> InputMethod{Payment Method?}

    InputMethod -->|QR Code| ScanQR[Scan QR Code]
    InputMethod -->|Manual| EnterDetails[Enter recipient & amount]

    ScanQR --> ParseQR[Parse QR data]
    ParseQR --> ValidateQR{QR valid & not expired?}
    ValidateQR -->|No| QRError[Display QR error]
    ValidateQR -->|Yes| ConfirmPayment

    EnterDetails --> ValidateInput{Input validation}
    ValidateInput -->|Invalid| InputError[Display input errors]
    ValidateInput -->|Valid| ConfirmPayment[Display payment confirmation]

    ConfirmPayment --> UserConfirm{User confirms?}
    UserConfirm -->|No| Cancel[Cancel payment]
    UserConfirm -->|Yes| FraudCheck[Fraud analysis]

    FraudCheck --> RiskEval{Risk level?}

    RiskEval -->|High| BlockTx[Block transaction]
    RiskEval -->|Medium| ManualReview[Queue for manual review]
    RiskEval -->|Low| ProcessPayment[Process payment]

    ManualReview --> AdminDecision{Admin decision?}
    AdminDecision -->|Approve| ProcessPayment
    AdminDecision -->|Reject| BlockTx

    ProcessPayment --> BankSubmit[Submit to bank]
    BankSubmit --> BankResponse{Bank response?}

    BankResponse -->|Success| RecordTx[Record transaction]
    BankResponse -->|Failure| PaymentFailed[Payment failed]
    BankResponse -->|Timeout| RetryLogic{Retry attempts left?}

    RetryLogic -->|Yes| BankSubmit
    RetryLogic -->|No| PaymentFailed

    RecordTx --> LoyaltyProcess[Process loyalty points]
    LoyaltyProcess --> SendNotifications[Send notifications]
    SendNotifications --> PaymentSuccess[Payment successful]

    QRError --> End([End])
    InputError --> EnterDetails
    Cancel --> End
    BlockTx --> End
    PaymentFailed --> End
    PaymentSuccess --> End

    style Start fill:#e1f5fe
    style End fill:#f3e5f5
    style BlockTx fill:#ffebee
    style PaymentFailed fill:#ffebee
    style PaymentSuccess fill:#e8f5e8
```

## Flowchart - Fraud Detection Logic

```mermaid
flowchart TD
    Start([Transaction submitted])
    InitScore[Initialize risk score = 0]

    Start --> InitScore
    InitScore --> AmountCheck{Amount > $10,000?}

    AmountCheck -->|Yes| HighAmount[Add 50 points]
    AmountCheck -->|No| MediumAmount{Amount > $5,000?}

    MediumAmount -->|Yes| MedAmountAdd[Add 25 points]
    MediumAmount -->|No| LowAmount{Amount > $1,000?}

    LowAmount -->|Yes| LowAmountAdd[Add 10 points]
    LowAmount -->|No| FrequencyCheck

    HighAmount --> FrequencyCheck
    MedAmountAdd --> FrequencyCheck
    LowAmountAdd --> FrequencyCheck

    FrequencyCheck[Get transactions last 1 hour]
    FrequencyCheck --> FreqEval{More than 10?}

    FreqEval -->|Yes| HighFreq[Add 40 points]
    FreqEval -->|No| MedFreq{More than 5?}

    MedFreq -->|Yes| MedFreqAdd[Add 20 points]
    MedFreq -->|No| AccountCheck

    HighFreq --> AccountCheck
    MedFreqAdd --> AccountCheck

    AccountCheck[Check account age]
    AccountCheck --> AgeEval{Account < 7 days?}

    AgeEval -->|Yes| NewAccount[Add 30 points]
    AgeEval -->|No| YoungAccount{Account < 30 days?}

    YoungAccount -->|Yes| YoungAdd[Add 15 points]
    YoungAccount -->|No| PatternCheck

    NewAccount --> PatternCheck
    YoungAdd --> PatternCheck

    PatternCheck[Analyze transaction patterns]
    PatternCheck --> UnusualTime{Unusual time?}

    UnusualTime -->|Yes| TimeAdd[Add 15 points]
    UnusualTime -->|No| NewRecipient{New recipient?}

    TimeAdd --> NewRecipient
    NewRecipient -->|Yes| RecipientAdd[Add 10 points]
    NewRecipient -->|No| FinalScore

    RecipientAdd --> FinalScore[Calculate final risk score]

    FinalScore --> ScoreEval{Risk score?}

    ScoreEval -->|> 80| HighRisk[HIGH RISK<br/>Block transaction]
    ScoreEval -->|50-80| MediumRisk[MEDIUM RISK<br/>Manual review]
    ScoreEval -->|< 50| LowRisk[LOW RISK<br/>Approve transaction]

    HighRisk --> AlertAdmin[Send fraud alert]
    MediumRisk --> QueueReview[Queue for review]
    LowRisk --> LogNormal[Log normal activity]

    AlertAdmin --> BlockEnd([Transaction blocked])
    QueueReview --> ReviewEnd([Pending review])
    LogNormal --> ApproveEnd([Transaction approved])

    style Start fill:#e1f5fe
    style HighRisk fill:#ffebee
    style MediumRisk fill:#fff3e0
    style LowRisk fill:#e8f5e8
    style BlockEnd fill:#ffebee
    style ReviewEnd fill:#fff3e0
    style ApproveEnd fill:#e8f5e8
```

## Object Diagram - Payment Transaction Example

```mermaid
flowchart TD
    subgraph "Payment Transaction Instance"
        Payment1["Payment #12345<br/>amount: $250.00<br/>status: COMPLETED<br/>method: QR_CODE<br/>created: 2026-02-13T10:30:00"]

        Customer1["Customer: Alice Smith<br/>phone: +1-555-0123<br/>iban: GB29NWBK60161331926819<br/>tier: GOLD"]

        Merchant1["Merchant: Coffee Shop<br/>business_name: Central Perk<br/>rating: 4.8 stars<br/>status: ACTIVE"]

        QR1["QR Code #789<br/>amount: $250.00<br/>expires: 2026-02-13T11:00:00<br/>status: USED"]

        Transaction1["Transaction #67890<br/>amount: $250.00<br/>status: COMPLETED<br/>bank_id: BNK_987654321<br/>timestamp: 2026-02-13T10:30:45"]

        Fraud1["Fraud Analysis #345<br/>risk_score: 15<br/>status: CLEAR<br/>rules: amount_check,frequency_check"]

        Loyalty1["Loyalty Transaction #456<br/>points_earned: 375<br/>tier_multiplier: 1.5x<br/>new_balance: 2,675"]

        Notification1["Email Receipt #111<br/>subject: Payment Confirmation<br/>status: SENT<br/>sent_at: 2026-02-13T10:31:00"]

        Notification2["Push Notification #222<br/>content: Payment successful<br/>status: DELIVERED<br/>sent_at: 2026-02-13T10:30:50"]
    end

    Payment1 -.-> Customer1
    Payment1 -.-> Merchant1
    Payment1 -.-> QR1
    Payment1 -.-> Transaction1
    Payment1 -.-> Fraud1
    Payment1 -.-> Loyalty1
    Payment1 -.-> Notification1
    Payment1 -.-> Notification2

    Customer1 -.-> Loyalty1
    Merchant1 -.-> QR1

    style Payment1 fill:#e3f2fd
    style Customer1 fill:#f3e5f5
    style Merchant1 fill:#e8f5e8
    style QR1 fill:#fff3e0
    style Transaction1 fill:#f1f8e9
    style Fraud1 fill:#fce4ec
    style Loyalty1 fill:#e0f2f1
    style Notification1 fill:#f8f9fa
    style Notification2 fill:#f8f9fa
```

These diagrams provide comprehensive views of the system architecture, data relationships, state management, process flows, and fraud detection logic, all aligned with the enterprise-grade requirements specified in the kata.
