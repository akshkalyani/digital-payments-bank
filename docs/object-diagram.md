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
