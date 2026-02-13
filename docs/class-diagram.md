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
    Payment ||--|| FraudAnalysis : "analyzed by"
    Payment ||--o{ Notification : "triggers"
    Payment ||--|| CashbackTransaction : "eligible for"

    QRCode ||--|| Payment : "initiates"

    FraudRule ||--o{ FraudAnalysis : "applied in"

    CashbackProgram ||--o{ CashbackTransaction : "applies to"

    Customer ||--o{ Notification : "receives"
    Merchant ||--o{ Notification : "receives"
```
