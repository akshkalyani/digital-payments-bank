# Sequence Diagrams

## 1. Payment with QR Code

```mermaid
sequenceDiagram
    participant C as Customer
    participant FE as Frontend
    participant PS as Payment Service
    participant QS as QR Service
    participant FS as Fraud Service
    participant BS as Bank Integration
    participant TS as Transaction Service
    participant NS as Notification Service
    participant LS as Loyalty Service

    Note over C,LS: QR-Based Payment Flow

    C->>FE: Open QR Scanner
    FE->>C: Display Camera View
    C->>FE: Scan QR Code
    FE->>QS: Parse QR Code
    QS->>QS: Validate QR Format
    QS->>QS: Extract Payment Details
    QS-->>FE: Return Payment Info
    FE->>C: Display Payment Details

    C->>FE: Confirm Payment
    FE->>PS: Initiate Payment Request

    Note over PS,FS: Fraud Detection Check
    PS->>FS: Check Transaction for Fraud
    FS->>FS: Apply Fraud Rules
    FS->>FS: Calculate Risk Score
    alt High Risk Score
        FS-->>PS: Flag as Suspicious
        PS-->>FE: Payment Blocked
        FE->>C: Display Fraud Alert
    else Low Risk Score
        FS-->>PS: Transaction Approved
    end

    Note over PS,BS: Bank Processing
    PS->>BS: Submit Payment to Bank
    BS->>BS: Validate Account Details
    BS->>BS: Process Payment
    alt Payment Successful
        BS-->>PS: Payment Confirmed
    else Payment Failed
        BS-->>PS: Payment Failed
        PS-->>FE: Payment Error
        FE->>C: Display Error Message
    end

    Note over PS,LS: Success Flow
    PS->>TS: Record Transaction
    TS->>TS: Save Transaction Details
    TS-->>PS: Transaction Recorded

    PS->>LS: Calculate Loyalty Points
    LS->>LS: Apply Points Rules
    LS->>LS: Update Customer Balance
    LS->>LS: Check Tier Progression
    LS-->>PS: Points Awarded

    PS->>NS: Send Payment Notifications
    NS->>NS: Format Notifications
    par Parallel Notifications
        NS->>C: Send Push Notification
    and
        NS->>C: Send Email Receipt
    and
        NS->>Merchant: Send Payment Confirmation
    end

    PS-->>FE: Payment Success Response
    FE->>C: Display Success Message
    FE->>C: Show Updated Balance
```

## 2. Payment without QR Code (Manual Payment)

```mermaid
sequenceDiagram
    participant C as Customer
    participant FE as Frontend
    participant CS as Customer Service
    participant MS as Merchant Service
    participant PS as Payment Service
    participant FS as Fraud Service
    participant BS as Bank Integration
    participant TS as Transaction Service
    participant NS as Notification Service
    participant LS as Loyalty Service

    Note over C,LS: Manual Payment Flow

    C->>FE: Navigate to Send Payment
    FE->>C: Display Payment Form

    C->>FE: Enter Recipient Details
    alt Search for Merchant
        FE->>MS: Search Merchants
        MS->>MS: Query Merchant Database
        MS-->>FE: Return Merchant List
        FE->>C: Display Merchant Options
        C->>FE: Select Merchant
    else Search for Customer
        FE->>CS: Search Customers
        CS->>CS: Query Customer Database
        CS-->>FE: Return Customer List
        FE->>C: Display Customer Options
        C->>FE: Select Customer
    end

    C->>FE: Enter Payment Amount
    C->>FE: Add Optional Message
    FE->>FE: Validate Form Data

    C->>FE: Confirm Payment
    FE->>PS: Submit Payment Request

    Note over PS,FS: Pre-Payment Validation
    PS->>PS: Validate Payment Data
    PS->>CS: Verify Sender Account
    CS-->>PS: Account Verified

    PS->>FS: Submit for Fraud Check
    FS->>FS: Apply Amount-Based Rules
    FS->>FS: Check Transaction Frequency
    FS->>FS: Validate Recipient
    FS->>FS: Calculate Composite Risk Score

    alt High Risk Detected
        FS-->>PS: Transaction Flagged
        PS->>NS: Send Fraud Alert
        NS->>Admin: Notify Security Team
        PS-->>FE: Payment Blocked - Manual Review Required
        FE->>C: Display Security Hold Message
    else Medium Risk
        FS-->>PS: Require Additional Verification
        PS-->>FE: Request Additional Auth
        FE->>C: Request Security Questions
        C->>FE: Provide Additional Auth
        FE->>PS: Submit Additional Verification
        PS->>FS: Recheck with Auth Data
        FS-->>PS: Verification Successful
    else Low Risk
        FS-->>PS: Transaction Approved
    end

    Note over PS,BS: Bank Processing
    PS->>BS: Execute Payment
    BS->>BS: Debit Sender Account
    BS->>BS: Credit Recipient Account
    BS->>BS: Generate Transaction ID
    alt Bank Processing Success
        BS-->>PS: Transaction Successful
    else Insufficient Funds
        BS-->>PS: Insufficient Funds Error
        PS-->>FE: Payment Failed - Insufficient Funds
        FE->>C: Display Balance Error
    else Bank System Error
        BS-->>PS: System Error
        PS-->>FE: Payment Failed - Try Again
        FE->>C: Display Retry Message
    end

    Note over PS,LS: Post-Payment Processing
    PS->>TS: Record Successful Transaction
    TS->>TS: Save Transaction with Bank ID
    TS->>TS: Update Transaction History
    TS-->>PS: Transaction Logged

    PS->>LS: Process Loyalty Rewards
    LS->>LS: Calculate Points (1% of amount)
    LS->>LS: Apply Tier Multipliers
    LS->>LS: Update Customer Points
    LS->>LS: Check for Tier Upgrades
    alt Tier Upgrade
        LS->>NS: Send Tier Upgrade Notification
    end
    LS-->>PS: Loyalty Processing Complete

    PS->>NS: Trigger Success Notifications
    NS->>NS: Generate Email Receipt
    NS->>NS: Format Push Notification
    par Parallel Notifications
        NS->>C: Email Receipt with PDF
    and
        NS->>C: Push Notification
    and
        NS->>Recipient: Payment Received Notification
    end

    PS-->>FE: Payment Completed Successfully
    FE->>FE: Update UI State
    FE->>C: Display Success Screen
    FE->>C: Show Transaction Details
    FE->>C: Offer Receipt Download
```

## 3. Fraud Detection Flow

```mermaid
sequenceDiagram
    participant PS as Payment Service
    participant FS as Fraud Service
    participant TS as Transaction Service
    participant CS as Customer Service
    participant NS as Notification Service
    participant Admin as Admin Dashboard

    Note over PS,Admin: Real-Time Fraud Detection

    PS->>FS: Submit Transaction for Analysis
    FS->>FS: Initialize Risk Score (0)

    Note over FS: Amount-Based Rules
    FS->>FS: Check Transaction Amount
    alt Amount > $10,000
        FS->>FS: Add 50 points to risk score
    else Amount > $5,000
        FS->>FS: Add 25 points to risk score
    else Amount > $1,000
        FS->>FS: Add 10 points to risk score
    end

    Note over FS: Frequency-Based Rules
    FS->>TS: Get Recent Transactions (Last 1 Hour)
    TS-->>FS: Return Transaction Count
    alt >10 transactions in 1 hour
        FS->>FS: Add 40 points to risk score
    else >5 transactions in 1 hour
        FS->>FS: Add 20 points to risk score
    end

    Note over FS: Pattern-Based Rules
    FS->>TS: Get Transaction History (Last 30 days)
    TS-->>FS: Return Transaction Patterns
    FS->>FS: Analyze for Unusual Patterns
    alt Unusual Time of Transaction
        FS->>FS: Add 15 points to risk score
    end
    alt New Recipient (Never Sent Before)
        FS->>FS: Add 10 points to risk score
    end

    Note over FS: Account-Based Rules
    FS->>CS: Get Customer Profile
    CS-->>FS: Return Account Age & Status
    alt Account Age < 7 days
        FS->>FS: Add 30 points to risk score
    else Account Age < 30 days
        FS->>FS: Add 15 points to risk score
    end

    Note over FS: Geographic Rules (Future Enhancement)
    FS->>FS: Check Location Patterns
    alt Unusual Location
        FS->>FS: Add 20 points to risk score
    end

    FS->>FS: Calculate Final Risk Score

    Note over FS,Admin: Risk Score Evaluation
    alt Risk Score > 80 (High Risk)
        FS->>FS: Mark as HIGH RISK
        FS->>NS: Send Immediate Alert
        NS->>Admin: Real-time Fraud Alert
        FS-->>PS: BLOCK TRANSACTION
        PS->>NS: Send Customer Notification
        NS->>Customer: Security Hold Notification
        FS->>FS: Log Fraud Case
    else Risk Score 50-80 (Medium Risk)
        FS->>FS: Mark as MEDIUM RISK
        FS->>NS: Send Review Alert
        NS->>Admin: Manual Review Required
        FS-->>PS: HOLD FOR REVIEW
        PS->>NS: Send Customer Notification
        NS->>Customer: Additional Verification Required
        FS->>FS: Queue for Manual Review
    else Risk Score < 50 (Low Risk)
        FS->>FS: Mark as LOW RISK
        FS-->>PS: APPROVE TRANSACTION
        FS->>FS: Log Normal Activity
    end

    Note over FS,Admin: Post-Processing
    FS->>FS: Update Fraud Models
    FS->>FS: Store Risk Analysis Results
    FS->>Admin: Update Fraud Dashboard
```

## 4. Loyalty Allocation Flow

```mermaid
sequenceDiagram
    participant PS as Payment Service
    participant LS as Loyalty Service
    participant CS as Customer Service
    participant NS as Notification Service
    participant CBS as Cashback Service

    Note over PS,CBS: Loyalty Points Processing

    PS->>LS: Process Loyalty for Transaction
    LS->>LS: Extract Transaction Details

    Note over LS: Customer Tier Retrieval
    LS->>CS: Get Customer Profile
    CS-->>LS: Return Customer Tier (Silver/Gold/Platinum)

    Note over LS: Base Points Calculation
    LS->>LS: Calculate Base Points (1% of amount)
    LS->>LS: Example: $100 transaction = 100 points

    Note over LS: Tier Multiplier Application
    alt Customer Tier = Platinum
        LS->>LS: Apply 2.0x multiplier
        LS->>LS: Example: 100 × 2.0 = 200 points
    else Customer Tier = Gold
        LS->>LS: Apply 1.5x multiplier
        LS->>LS: Example: 100 × 1.5 = 150 points
    else Customer Tier = Silver
        LS->>LS: Apply 1.0x multiplier (base)
        LS->>LS: Example: 100 × 1.0 = 100 points
    end

    Note over LS: Bonus Points Check
    LS->>LS: Check for Special Promotions
    alt First Transaction of Day
        LS->>LS: Add 10 bonus points
    end
    alt Transaction with Rated Merchant (>4 stars)
        LS->>LS: Add 5 bonus points
    end

    Note over LS: Cashback Integration
    LS->>CBS: Check for Cashback Eligibility
    CBS->>CBS: Verify Bank Card Type
    alt Eligible for Cashback
        CBS->>CBS: Calculate Cashback Amount
        CBS-->>LS: Return Cashback Details
        LS->>LS: Convert Cashback to Bonus Points
    else Not Eligible
        CBS-->>LS: No Cashback Available
    end

    Note over LS: Points Update
    LS->>LS: Calculate Final Points Award
    LS->>LS: Update Customer Points Balance
    LS->>LS: Record Points Transaction History

    Note over LS: Tier Progression Check
    LS->>LS: Get Total Points This Month
    LS->>LS: Check Tier Progression Rules
    alt Silver → Gold (5000+ points in 30 days)
        LS->>LS: Upgrade Customer to Gold
        LS->>CS: Update Customer Tier
        CS-->>LS: Tier Updated Successfully
        LS->>NS: Send Tier Upgrade Notification
        NS->>Customer: Congratulations on Gold Status!
    else Gold → Platinum (15000+ points in 30 days)
        LS->>LS: Upgrade Customer to Platinum
        LS->>CS: Update Customer Tier
        CS-->>LS: Tier Updated Successfully
        LS->>NS: Send Tier Upgrade Notification
        NS->>Customer: Welcome to Platinum Status!
    else No Tier Change
        LS->>LS: Maintain Current Tier
    end

    Note over LS: Points Redemption Check
    alt Customer Chose to Redeem Points
        LS->>LS: Validate Points Balance
        LS->>LS: Calculate Redemption Value (100 points = $1)
        LS->>LS: Deduct Redeemed Points
        LS-->>PS: Return Discount Amount
        PS->>PS: Apply Discount to Transaction
    else No Points Redemption
        LS-->>PS: No Discount Applied
    end

    Note over LS: Final Notification
    LS->>NS: Send Points Update Notification
    NS->>Customer: You earned X points! New balance: Y points

    LS-->>PS: Loyalty Processing Complete
    PS->>PS: Log Loyalty Transaction
```

## Key Sequence Diagram Notes

### QR Payment Highlights:

- **Real-time fraud detection** before bank processing
- **Parallel notifications** for efficiency
- **Automatic loyalty points** calculation and tier checks
- **Comprehensive error handling** at each stage

### Manual Payment Highlights:

- **Multi-level fraud detection** with escalating security measures
- **Flexible recipient search** (customers or merchants)
- **Robust bank integration** with multiple failure scenarios
- **Rich notification system** with multiple channels

### Fraud Detection Highlights:

- **Rule-based scoring system** with configurable thresholds
- **Real-time analysis** with immediate blocking capability
- **Manual review workflow** for medium-risk transactions
- **Comprehensive logging** for audit and improvement

### Loyalty Allocation Highlights:

- **Tier-based multipliers** for customer retention
- **Dynamic tier progression** with automatic upgrades
- **Cashback integration** for additional value
- **Real-time points redemption** during payment

These sequences demonstrate the production-ready, enterprise-grade architecture with proper error handling, security, and user experience considerations.
