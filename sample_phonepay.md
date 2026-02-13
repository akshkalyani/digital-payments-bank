**Sample Phonepay**

I’ll give you **AWS-first** (most Indian fintechs use it), plus **two tracks**:

* ✅ **Predefined / Managed (faster, slightly costlier)**
* 🛠 **Buildable / Optimized (cheapest, more control)**

You can mix both.

---

## 📐 High-Level Architecture (AWS – PhonePe/Paytm inspired)

---

## 🧱 HLD – Logical Layers

### 1️⃣ Client Layer

* Android App
* iOS App
* Merchant Web Dashboard

➡️ Communicates via HTTPS (TLS)

---

### 2️⃣ Edge & API Layer

**Purpose:** Security, routing, throttling

| Component   | Managed (Fast)  | Buildable (Cheap) |
| ----------- | --------------- | ----------------- |
| DNS         | Route53         | Route53           |
| CDN         | CloudFront      | CloudFront        |
| API Gateway | AWS API Gateway | NGINX on EC2      |
| WAF         | AWS WAF         | AWS WAF (same)    |

✅ **Recommendation:**
Use **API Gateway for MVP**, migrate to **NGINX** later to save cost at scale.

---

### 3️⃣ Authentication & Identity

Handles:

* OTP login
* JWT tokens
* Merchant auth
* Device binding

| Component | Choice                         |
| --------- | ------------------------------ |
| Auth      | Amazon Cognito *(cheap early)* |
| OTP       | SNS / 3rd-party SMS            |
| Token     | JWT                            |

💡 Many startups later **replace Cognito** with custom auth to reduce cost.

---

### 4️⃣ Core Microservices Layer (EKS / ECS / EC2)

**Core Services**

* Auth Service
* User Service
* Merchant Service
* Payment Orchestrator 🧠
* UPI Integration Service
* Ledger Service
* Settlement Service
* Notification Service
* Risk & Rules Engine

| Managed     | Buildable        |
| ----------- | ---------------- |
| ECS Fargate | EC2 Auto Scaling |
| EKS         | EC2 + Docker     |

✅ **Cost-Optimized Pick:**
👉 **EC2 + Docker + Auto Scaling**
(EKS is powerful but expensive early)

---

### 5️⃣ Payment Orchestration (MOST IMPORTANT)

This service:

* Creates transaction
* Calls UPI PSP
* Maintains state machine
* Handles retries & callbacks

**Design Pattern**

```
INIT → SENT_TO_BANK → PENDING → SUCCESS / FAILED
```

Uses:

* Idempotency keys
* Async callbacks
* Timeouts

---

### 6️⃣ UPI / Bank Integration Layer

You **do not talk to NPCI directly**.

You integrate with:

* Sponsor Bank
* UPI Aggregator

Security:

* mTLS
* Signed payloads
* Static IPs
* Secrets Manager

---

### 7️⃣ Ledger & Accounting (Non-negotiable)

**Separate service + DB**

| Rule              | Why                   |
| ----------------- | --------------------- |
| Immutable entries | Audit                 |
| Double-entry      | Financial correctness |
| Event-based       | Reconciliation        |

**Never compute balance on the fly.**

---

### 8️⃣ Async & Event Layer

Used for:

* Payment updates
* Notifications
* Webhooks
* Settlement

| Managed | Buildable       |
| ------- | --------------- |
| SQS     | RabbitMQ on EC2 |
| SNS     | Kafka (later)   |

✅ Start with **SQS + SNS** (cheap + reliable)

---

### 9️⃣ Data Layer

| Data      | Technology                |
| --------- | ------------------------- |
| Core DB   | Amazon RDS (PostgreSQL)   |
| Cache     | ElastiCache (Redis)       |
| Logs      | CloudWatch                |
| Analytics | Athena / Redshift (later) |

💡 Keep **ledger DB separate** from user DB.

---

### 🔟 Notifications

* Push: Firebase
* SMS: SNS / Vendor
* Email: SES
* Webhooks: Async queue

---

### 1️⃣1️⃣ Admin & Ops

Internal dashboard:

* KYC approval
* Disputes
* Reversals
* Settlement release

Protected via:

* VPN
* IAM roles

---

## 💸 COST-OPTIMIZED AWS SETUP (REALISTIC)

### 🔹 MVP (₹25k–₹40k / month)

* EC2 (2–3 t3.small)
* RDS PostgreSQL (single AZ)
* API Gateway
* SQS
* CloudWatch
* S3
* Route53

👶 Handles **10k–50k users**

---

### 🔹 Growth (₹80k–₹1.5L / month)

* EC2 Auto Scaling
* Read replicas
* Redis cache
* NGINX
* Multi-AZ RDS
* Dedicated ledger DB

🚀 Handles **1M+ users**

---

### 🔹 Scale (PhonePe-like)

* Active-active regions
* Multi-bank routing
* Kafka
* HSM
* Custom fraud ML
* Zero-downtime deploys

---

## 🟢 Why This Architecture Works

✔ Cheap initially
✔ RBI-friendly
✔ Horizontally scalable
✔ Failure-tolerant
✔ Easy to evolve

This is **very close to what real Indian fintechs do**, just simplified.



We’ll design it *perfectly for YOUR startup*, not generic slides 💪
