const {
  FraudCheck,
  FraudRule,
  CustomerRiskProfile,
  FraudAlert,
} = require("../models");
const {
  createLogger,
  FRAUD_DECISIONS,
  RISK_LEVELS,
} = require("../../../shared/utils");
const { Op } = require("sequelize");

class FraudService {
  constructor() {
    this.logger = createLogger("fraud-service");
  }

  /**
   * Perform comprehensive fraud check on a transaction
   */
  async performFraudCheck(transactionData) {
    try {
      const {
        paymentId,
        customerId,
        merchantId,
        amount,
        currency = "USD",
        method,
        location,
        deviceInfo,
        timestamp = new Date(),
      } = transactionData;

      this.logger.info(
        `Starting fraud check for payment ${paymentId}, customer ${customerId}, amount ${amount}`,
      );

      // Get customer risk profile
      let riskProfile = await this.getCustomerRiskProfile(customerId);
      if (!riskProfile) {
        riskProfile = await this.createCustomerRiskProfile(customerId);
      }

      // Initialize risk assessment
      let riskScore = riskProfile.baseRiskScore;
      let rulesFired = [];
      let riskFactors = [];

      // Check if customer is blacklisted
      if (riskProfile.isBlacklisted) {
        return await this.createFraudCheck({
          paymentId,
          customerId,
          merchantId,
          amount,
          currency,
          riskScore: 100,
          riskLevel: "CRITICAL",
          decision: "BLOCK",
          reason: `Customer is blacklisted: ${riskProfile.blacklistReason}`,
          rulesFired: [{ rule: "BLACKLIST_CHECK", triggered: true }],
        });
      }

      // Get active fraud rules
      const activeRules = await FraudRule.findAll({
        where: { isActive: true },
        order: [["severity", "DESC"]],
      });

      // Evaluate each fraud rule
      for (const rule of activeRules) {
        const ruleResult = await this.evaluateRule(rule, {
          customerId,
          merchantId,
          amount,
          currency,
          method,
          location,
          deviceInfo,
          timestamp,
          riskProfile,
        });

        if (ruleResult.triggered) {
          riskScore += rule.scoreImpact;
          rulesFired.push({
            rule: rule.name,
            type: rule.type,
            severity: rule.severity,
            impact: rule.scoreImpact,
            details: ruleResult.details,
          });
          riskFactors.push(ruleResult.reason);
        }
      }

      // Cap risk score at 100
      riskScore = Math.min(100, riskScore);

      // Determine risk level and decision
      const { riskLevel, decision } = this.calculateRiskLevelAndDecision(
        riskScore,
        rulesFired,
      );

      // Create fraud check record
      const fraudCheck = await this.createFraudCheck({
        paymentId,
        customerId,
        merchantId,
        amount,
        currency,
        riskScore,
        riskLevel,
        decision,
        reason: riskFactors.join("; "),
        rulesFired,
        metadata: {
          location,
          deviceInfo,
          method,
          evaluationTimestamp: new Date(),
        },
      });

      // Create alerts for high-risk transactions
      if (riskLevel === "HIGH" || riskLevel === "CRITICAL") {
        await this.createFraudAlert(fraudCheck);
      }

      // Update customer risk profile
      await this.updateCustomerProfile(
        customerId,
        amount,
        decision === "BLOCK",
      );

      this.logger.info(
        `Fraud check completed: ${fraudCheck.checkId}, decision: ${decision}, risk: ${riskLevel}`,
      );
      return fraudCheck;
    } catch (error) {
      this.logger.error("Error performing fraud check:", error);
      throw error;
    }
  }

  /**
   * Evaluate a specific fraud rule
   */
  async evaluateRule(rule, transactionData) {
    try {
      const {
        customerId,
        merchantId,
        amount,
        currency,
        method,
        location,
        timestamp,
      } = transactionData;

      switch (rule.type) {
        case "VELOCITY":
          return await this.evaluateVelocityRule(
            rule,
            customerId,
            amount,
            timestamp,
          );

        case "AMOUNT":
          return await this.evaluateAmountRule(rule, amount, currency);

        case "LOCATION":
          return await this.evaluateLocationRule(rule, customerId, location);

        case "PATTERN":
          return await this.evaluatePatternRule(
            rule,
            customerId,
            transactionData,
          );

        case "TIME_WINDOW":
          return await this.evaluateTimeWindowRule(rule, timestamp);

        case "BLACKLIST":
          return await this.evaluateBlacklistRule(rule, customerId, merchantId);

        default:
          return { triggered: false, reason: "", details: {} };
      }
    } catch (error) {
      this.logger.error(`Error evaluating rule ${rule.name}:`, error);
      return { triggered: false, reason: "", details: {} };
    }
  }

  /**
   * Evaluate velocity-based rules (transaction frequency/amount)
   */
  async evaluateVelocityRule(rule, customerId, amount, timestamp) {
    const conditions = rule.conditions;
    const timeWindow = conditions.timeWindowMinutes || 60;
    const startTime = new Date(timestamp.getTime() - timeWindow * 60 * 1000);

    // Count recent transactions
    const recentChecks = await FraudCheck.findAll({
      where: {
        customerId,
        createdAt: { [Op.gte]: startTime },
      },
    });

    const transactionCount = recentChecks.length;
    const totalAmount = recentChecks.reduce(
      (sum, check) => sum + parseFloat(check.amount),
      0,
    );

    let triggered = false;
    let reason = "";

    // Check transaction count velocity
    if (
      conditions.maxTransactions &&
      transactionCount >= conditions.maxTransactions
    ) {
      triggered = true;
      reason += `Too many transactions: ${transactionCount} in ${timeWindow} minutes. `;
    }

    // Check amount velocity
    if (conditions.maxAmount && totalAmount >= conditions.maxAmount) {
      triggered = true;
      reason += `Transaction amount velocity exceeded: $${totalAmount} in ${timeWindow} minutes. `;
    }

    return {
      triggered,
      reason: reason.trim(),
      details: { transactionCount, totalAmount, timeWindow },
    };
  }

  /**
   * Evaluate amount-based rules
   */
  async evaluateAmountRule(rule, amount, currency) {
    const conditions = rule.conditions;
    let triggered = false;
    let reason = "";

    // Check minimum amount threshold
    if (conditions.minAmount && amount >= conditions.minAmount) {
      triggered = true;
      reason = `Large transaction amount: ${currency} ${amount}`;
    }

    // Check unusual amount patterns (round numbers, etc.)
    if (conditions.flagRoundAmounts && amount % 1000 === 0 && amount >= 5000) {
      triggered = true;
      reason += ` Round amount pattern detected: ${currency} ${amount}`;
    }

    return {
      triggered,
      reason: reason.trim(),
      details: { amount, currency, thresholdChecked: conditions.minAmount },
    };
  }

  /**
   * Evaluate location-based rules
   */
  async evaluateLocationRule(rule, customerId, location) {
    if (!location) {
      return { triggered: false, reason: "", details: {} };
    }

    const conditions = rule.conditions;
    let triggered = false;
    let reason = "";

    // Check high-risk countries/regions (mock implementation)
    if (
      conditions.blockedCountries &&
      conditions.blockedCountries.includes(location.country)
    ) {
      triggered = true;
      reason = `Transaction from blocked country: ${location.country}`;
    }

    // Check location velocity (rapid location changes)
    if (conditions.checkLocationVelocity) {
      const recentChecks = await FraudCheck.findAll({
        where: {
          customerId,
          createdAt: { [Op.gte]: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
          metadata: { [Op.ne]: null },
        },
        order: [["createdAt", "DESC"]],
        limit: 5,
      });

      // Simple location velocity check (would use proper geolocation in production)
      if (recentChecks.length > 0) {
        const lastLocation = recentChecks[0].metadata?.location;
        if (lastLocation && lastLocation.country !== location.country) {
          triggered = true;
          reason += ` Rapid location change: ${lastLocation.country} to ${location.country}`;
        }
      }
    }

    return {
      triggered,
      reason: reason.trim(),
      details: { location, checkedCountries: conditions.blockedCountries },
    };
  }

  /**
   * Evaluate pattern-based rules
   */
  async evaluatePatternRule(rule, customerId, transactionData) {
    const conditions = rule.conditions;
    let triggered = false;
    let reason = "";

    // Check for unusual time patterns
    if (conditions.flagNightTimeTransactions) {
      const hour = transactionData.timestamp.getHours();
      if (hour >= 23 || hour <= 5) {
        triggered = true;
        reason = "Transaction during unusual hours (night time)";
      }
    }

    // Check for repeated identical amounts
    if (conditions.flagIdenticalAmounts) {
      const recentSameAmounts = await FraudCheck.count({
        where: {
          customerId,
          amount: transactionData.amount,
          createdAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      if (recentSameAmounts >= 3) {
        triggered = true;
        reason += ` Repeated identical amount: ${transactionData.amount}`;
      }
    }

    return {
      triggered,
      reason: reason.trim(),
      details: { patternType: "behavioral", conditions },
    };
  }

  /**
   * Evaluate time window rules
   */
  async evaluateTimeWindowRule(rule, timestamp) {
    const conditions = rule.conditions;
    const hour = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();

    let triggered = false;
    let reason = "";

    // Check blocked hours
    if (conditions.blockedHours && conditions.blockedHours.includes(hour)) {
      triggered = true;
      reason = `Transaction during blocked hours: ${hour}:00`;
    }

    // Check blocked days
    if (conditions.blockedDays && conditions.blockedDays.includes(dayOfWeek)) {
      triggered = true;
      reason += ` Transaction on blocked day: ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayOfWeek]}`;
    }

    return {
      triggered,
      reason: reason.trim(),
      details: { hour, dayOfWeek },
    };
  }

  /**
   * Evaluate blacklist rules
   */
  async evaluateBlacklistRule(rule, customerId, merchantId) {
    const conditions = rule.conditions;
    let triggered = false;
    let reason = "";

    // Check customer blacklist
    if (conditions.checkCustomers) {
      const customerProfile = await CustomerRiskProfile.findOne({
        where: { customerId, isBlacklisted: true },
      });

      if (customerProfile) {
        triggered = true;
        reason = `Customer ${customerId} is blacklisted: ${customerProfile.blacklistReason}`;
      }
    }

    // Check merchant blacklist (simplified - would check merchant service)
    if (conditions.checkMerchants && merchantId) {
      // Mock merchant blacklist check
      const blacklistedMerchants = conditions.blacklistedMerchants || [];
      if (blacklistedMerchants.includes(merchantId)) {
        triggered = true;
        reason += ` Merchant ${merchantId} is blacklisted`;
      }
    }

    return {
      triggered,
      reason: reason.trim(),
      details: {
        checkedCustomer: !!conditions.checkCustomers,
        checkedMerchant: !!conditions.checkMerchants,
      },
    };
  }

  /**
   * Calculate risk level and decision based on score and rules
   */
  calculateRiskLevelAndDecision(riskScore, rulesFired) {
    let riskLevel = "LOW";
    let decision = "ALLOW";

    // Check for critical rules first
    const criticalRules = rulesFired.filter(
      (rule) => rule.severity === "CRITICAL",
    );
    if (criticalRules.length > 0) {
      riskLevel = "CRITICAL";
      decision = "BLOCK";
    } else if (riskScore >= 80) {
      riskLevel = "CRITICAL";
      decision = "BLOCK";
    } else if (riskScore >= 60) {
      riskLevel = "HIGH";
      decision = "REVIEW";
    } else if (riskScore >= 40) {
      riskLevel = "MEDIUM";
      decision = "REVIEW";
    } else if (riskScore >= 20) {
      riskLevel = "MEDIUM";
      decision = "ALLOW";
    }

    return { riskLevel, decision };
  }

  /**
   * Create fraud check record
   */
  async createFraudCheck(data) {
    try {
      return await FraudCheck.create(data);
    } catch (error) {
      this.logger.error("Error creating fraud check:", error);
      throw error;
    }
  }

  /**
   * Create fraud alert
   */
  async createFraudAlert(fraudCheck) {
    try {
      let alertType = "HIGH_RISK_TRANSACTION";
      if (fraudCheck.riskLevel === "CRITICAL") {
        alertType = "SUSPICIOUS_PATTERN";
      }

      const alert = await FraudAlert.create({
        type: alertType,
        severity: fraudCheck.riskLevel,
        customerId: fraudCheck.customerId,
        paymentId: fraudCheck.paymentId,
        fraudCheckId: fraudCheck.checkId,
        title: `${fraudCheck.riskLevel} Risk Transaction Detected`,
        description: `Transaction flagged with risk score ${fraudCheck.riskScore}. Reason: ${fraudCheck.reason}`,
      });

      this.logger.warn(
        `Fraud alert created: ${alert.alertId} for customer ${fraudCheck.customerId}`,
      );
      return alert;
    } catch (error) {
      this.logger.error("Error creating fraud alert:", error);
      throw error;
    }
  }

  /**
   * Get or create customer risk profile
   */
  async getCustomerRiskProfile(customerId) {
    try {
      return await CustomerRiskProfile.findOne({
        where: { customerId },
      });
    } catch (error) {
      this.logger.error("Error getting customer risk profile:", error);
      throw error;
    }
  }

  /**
   * Create customer risk profile
   */
  async createCustomerRiskProfile(customerId) {
    try {
      const profile = await CustomerRiskProfile.create({
        customerId,
        baseRiskScore: 15, // New customers start with moderate risk
        trustLevel: "NEW",
      });

      this.logger.info(`Created risk profile for customer ${customerId}`);
      return profile;
    } catch (error) {
      this.logger.error("Error creating customer risk profile:", error);
      throw error;
    }
  }

  /**
   * Update customer profile after transaction
   */
  async updateCustomerProfile(customerId, amount, isFraud = false) {
    try {
      let profile = await this.getCustomerRiskProfile(customerId);
      if (!profile) {
        profile = await this.createCustomerRiskProfile(customerId);
      }

      profile.totalTransactions += 1;
      profile.totalAmount =
        parseFloat(profile.totalAmount) + parseFloat(amount);

      if (isFraud) {
        profile.fraudIncidents += 1;
        profile.lastIncidentAt = new Date();
        await profile.updateRiskScore(20); // Increase risk for fraud
      } else {
        // Decrease risk slightly for successful transactions
        await profile.updateRiskScore(-1);
      }

      this.logger.info(`Updated risk profile for customer ${customerId}`);
      return profile;
    } catch (error) {
      this.logger.error("Error updating customer profile:", error);
      throw error;
    }
  }

  /**
   * Get fraud check by ID
   */
  async getFraudCheck(checkId) {
    try {
      return await FraudCheck.findByPk(checkId, {
        include: [{ model: FraudAlert }, { model: CustomerRiskProfile }],
      });
    } catch (error) {
      this.logger.error("Error getting fraud check:", error);
      throw error;
    }
  }

  /**
   * Review fraud check (approve/reject)
   */
  async reviewFraudCheck(checkId, reviewerId, decision, notes = "") {
    try {
      const fraudCheck = await FraudCheck.findByPk(checkId);
      if (!fraudCheck) {
        throw new Error("Fraud check not found");
      }

      if (decision === "APPROVED") {
        await fraudCheck.approve(reviewerId, notes);
      } else {
        await fraudCheck.reject(reviewerId, notes);

        // Update customer risk if rejected
        await this.updateCustomerProfile(fraudCheck.customerId, 0, true);
      }

      this.logger.info(
        `Fraud check ${checkId} reviewed by ${reviewerId}: ${decision}`,
      );
      return fraudCheck;
    } catch (error) {
      this.logger.error("Error reviewing fraud check:", error);
      throw error;
    }
  }

  /**
   * Get fraud alerts with filters
   */
  async getFraudAlerts(filters = {}) {
    try {
      const {
        status,
        severity,
        type,
        customerId,
        page = 0,
        size = 20,
      } = filters;

      const where = {};
      if (status) where.status = status;
      if (severity) where.severity = severity;
      if (type) where.type = type;
      if (customerId) where.customerId = customerId;

      const { rows: alerts, count: total } = await FraudAlert.findAndCountAll({
        where,
        include: [{ model: FraudCheck }],
        order: [["createdAt", "DESC"]],
        limit: size,
        offset: page * size,
      });

      return {
        content: alerts,
        totalElements: total,
        totalPages: Math.ceil(total / size),
        size,
        number: page,
      };
    } catch (error) {
      this.logger.error("Error getting fraud alerts:", error);
      throw error;
    }
  }

  /**
   * Get fraud statistics
   */
  async getFraudStatistics(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [totalChecks, blockedTransactions, reviewRequests, falsePositives] =
        await Promise.all([
          FraudCheck.count({ where: { createdAt: { [Op.gte]: startDate } } }),
          FraudCheck.count({
            where: { decision: "BLOCK", createdAt: { [Op.gte]: startDate } },
          }),
          FraudCheck.count({
            where: { decision: "REVIEW", createdAt: { [Op.gte]: startDate } },
          }),
          FraudAlert.count({
            where: {
              status: "FALSE_POSITIVE",
              createdAt: { [Op.gte]: startDate },
            },
          }),
        ]);

      const blockRate =
        totalChecks > 0 ? (blockedTransactions / totalChecks) * 100 : 0;
      const reviewRate =
        totalChecks > 0 ? (reviewRequests / totalChecks) * 100 : 0;

      return {
        period: `${days} days`,
        totalChecks,
        blockedTransactions,
        reviewRequests,
        allowedTransactions: totalChecks - blockedTransactions - reviewRequests,
        blockRate: parseFloat(blockRate.toFixed(2)),
        reviewRate: parseFloat(reviewRate.toFixed(2)),
        falsePositives,
        accuracy:
          totalChecks > 0
            ? parseFloat(
                (((totalChecks - falsePositives) / totalChecks) * 100).toFixed(
                  2,
                ),
              )
            : 100,
      };
    } catch (error) {
      this.logger.error("Error getting fraud statistics:", error);
      throw error;
    }
  }

  /**
   * Blacklist/whitelist customer
   */
  async updateCustomerBlacklist(customerId, isBlacklisted, reason = "") {
    try {
      let profile = await this.getCustomerRiskProfile(customerId);
      if (!profile) {
        profile = await this.createCustomerRiskProfile(customerId);
      }

      if (isBlacklisted) {
        await profile.blacklist(reason);
        this.logger.warn(`Customer ${customerId} blacklisted: ${reason}`);
      } else {
        await profile.whitelist();
        this.logger.info(`Customer ${customerId} removed from blacklist`);
      }

      return profile;
    } catch (error) {
      this.logger.error("Error updating customer blacklist:", error);
      throw error;
    }
  }
}

module.exports = FraudService;
