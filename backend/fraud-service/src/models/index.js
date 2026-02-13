const { createDatabase } = require('../../../shared/database');
const { DataTypes } = require('sequelize');

// Initialize database
const sequelize = createDatabase('fraud-service');

// Fraud Check model
const FraudCheck = sequelize.define('FraudCheck', {
  checkId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  paymentId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Payment ID being checked'
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Customer ID involved in transaction'
  },
  merchantId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Merchant ID for merchant transactions'
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'USD'
  },
  riskScore: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0,
      max: 100
    },
    comment: 'Risk score from 0 (safe) to 100 (high risk)'
  },
  riskLevel: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
    allowNull: false
  },
  decision: {
    type: DataTypes.ENUM('ALLOW', 'REVIEW', 'BLOCK'),
    allowNull: false
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Detailed reason for the decision'
  },
  rulesFired: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'List of fraud rules that triggered'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional context data for the check'
  },
  reviewedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Admin ID who reviewed the transaction'
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reviewDecision: {
    type: DataTypes.ENUM('APPROVED', 'REJECTED'),
    allowNull: true
  },
  reviewNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  indexes: [
    {
      fields: ['customerId']
    },
    {
      fields: ['merchantId']
    },
    {
      fields: ['paymentId']
    },
    {
      fields: ['riskLevel']
    },
    {
      fields: ['decision']
    },
    {
      fields: ['createdAt']
    }
  ]
});

// Fraud Rule model
const FraudRule = sequelize.define('FraudRule', {
  ruleId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('VELOCITY', 'AMOUNT', 'LOCATION', 'PATTERN', 'BLACKLIST', 'TIME_WINDOW'),
    allowNull: false
  },
  severity: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
    allowNull: false
  },
  scoreImpact: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 50
    },
    comment: 'Points to add to risk score when rule triggers'
  },
  conditions: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Rule conditions and parameters'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Admin ID who created the rule'
  }
}, {
  indexes: [
    {
      fields: ['type']
    },
    {
      fields: ['severity']
    },
    {
      fields: ['isActive']
    }
  ]
});

// Customer Risk Profile model
const CustomerRiskProfile = sequelize.define('CustomerRiskProfile', {
  profileId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  baseRiskScore: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    validate: {
      min: 0,
      max: 100
    },
    comment: 'Base risk score for this customer'
  },
  trustLevel: {
    type: DataTypes.ENUM('NEW', 'LOW', 'MEDIUM', 'HIGH', 'TRUSTED'),
    defaultValue: 'NEW',
    allowNull: false
  },
  totalTransactions: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  totalAmount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    allowNull: false
  },
  fraudIncidents: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  lastIncidentAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isBlacklisted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  blacklistReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  blacklistedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  behaviorPattern: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Customer behavior analysis'
  },
  lastUpdated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  indexes: [
    {
      fields: ['customerId']
    },
    {
      fields: ['trustLevel']
    },
    {
      fields: ['isBlacklisted']
    }
  ]
});

// Fraud Alert model
const FraudAlert = sequelize.define('FraudAlert', {
  alertId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('HIGH_RISK_TRANSACTION', 'SUSPICIOUS_PATTERN', 'BLACKLISTED_USER', 'VELOCITY_EXCEEDED', 'AMOUNT_ANOMALY'),
    allowNull: false
  },
  severity: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
    allowNull: false
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  paymentId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  fraudCheckId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: FraudCheck,
      key: 'checkId'
    }
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('OPEN', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE'),
    defaultValue: 'OPEN',
    allowNull: false
  },
  assignedTo: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Admin ID assigned to investigate'
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolution: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  indexes: [
    {
      fields: ['type']
    },
    {
      fields: ['severity']
    },
    {
      fields: ['customerId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['assignedTo']
    }
  ]
});

// Define associations
FraudCheck.hasMany(FraudAlert, { foreignKey: 'fraudCheckId' });
FraudAlert.belongsTo(FraudCheck, { foreignKey: 'fraudCheckId' });

CustomerRiskProfile.hasMany(FraudCheck, { foreignKey: 'customerId', sourceKey: 'customerId' });
FraudCheck.belongsTo(CustomerRiskProfile, { foreignKey: 'customerId', targetKey: 'customerId' });

// Instance methods
FraudCheck.prototype.isHighRisk = function() {
  return this.riskLevel === 'HIGH' || this.riskLevel === 'CRITICAL';
};

FraudCheck.prototype.requiresReview = function() {
  return this.decision === 'REVIEW';
};

FraudCheck.prototype.approve = async function(reviewerId, notes = '') {
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewDecision = 'APPROVED';
  this.reviewNotes = notes;
  await this.save();
  return this;
};

FraudCheck.prototype.reject = async function(reviewerId, notes = '') {
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewDecision = 'REJECTED';
  this.reviewNotes = notes;
  await this.save();
  return this;
};

CustomerRiskProfile.prototype.updateRiskScore = async function(increment) {
  this.baseRiskScore = Math.min(100, Math.max(0, this.baseRiskScore + increment));
  
  // Update trust level based on risk score
  if (this.baseRiskScore >= 80) {
    this.trustLevel = 'LOW';
  } else if (this.baseRiskScore >= 50) {
    this.trustLevel = 'MEDIUM';
  } else if (this.baseRiskScore >= 20) {
    this.trustLevel = 'HIGH';
  } else if (this.totalTransactions > 100) {
    this.trustLevel = 'TRUSTED';
  }
  
  this.lastUpdated = new Date();
  await this.save();
  return this;
};

CustomerRiskProfile.prototype.blacklist = async function(reason) {
  this.isBlacklisted = true;
  this.blacklistReason = reason;
  this.blacklistedAt = new Date();
  this.baseRiskScore = 100;
  this.trustLevel = 'LOW';
  await this.save();
  return this;
};

CustomerRiskProfile.prototype.whitelist = async function() {
  this.isBlacklisted = false;
  this.blacklistReason = null;
  this.blacklistedAt = null;
  this.baseRiskScore = Math.max(10, this.baseRiskScore - 30);
  await this.save();
  return this;
};

FraudAlert.prototype.resolve = async function(resolution, assigneeId = null) {
  this.status = 'RESOLVED';
  this.resolvedAt = new Date();
  this.resolution = resolution;
  if (assigneeId) this.assignedTo = assigneeId;
  await this.save();
  return this;
};

FraudAlert.prototype.markFalsePositive = async function(assigneeId = null) {
  this.status = 'FALSE_POSITIVE';
  this.resolvedAt = new Date();
  this.resolution = 'Marked as false positive';
  if (assigneeId) this.assignedTo = assigneeId;
  await this.save();
  return this;
};

module.exports = {
  sequelize,
  FraudCheck,
  FraudRule,
  CustomerRiskProfile,
  FraudAlert
};