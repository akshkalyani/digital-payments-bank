const { DataTypes } = require("sequelize");
const { createModel } = require("../../../shared/database");
const { LOYALTY_TIER } = require("../../../shared/utils");

const createLoyaltyAccountModel = (sequelize) => {
  const LoyaltyAccount = createModel(
    sequelize,
    "LoyaltyAccount",
    {
      loyaltyId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "loyalty_id",
      },
      customerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        field: "customer_id",
        references: {
          model: "customers",
          key: "customer_id",
        },
      },
      pointsBalance: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "points_balance",
        validate: {
          min: 0,
        },
      },
      tier: {
        type: DataTypes.ENUM(...Object.values(LOYALTY_TIER)),
        allowNull: false,
        defaultValue: LOYALTY_TIER.SILVER,
      },
      totalPointsEarned: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "total_points_earned",
        validate: {
          min: 0,
        },
      },
      totalPointsRedeemed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "total_points_redeemed",
        validate: {
          min: 0,
        },
      },
      lastTierUpdate: {
        type: DataTypes.DATE,
        field: "last_tier_update",
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "loyalty_accounts",
      indexes: [
        {
          unique: true,
          fields: ["customer_id"],
        },
        {
          fields: ["tier"],
        },
        {
          fields: ["points_balance"],
        },
      ],
    },
  );

  // Instance methods
  LoyaltyAccount.prototype.addPoints = function (points, description = "") {
    this.pointsBalance += points;
    this.totalPointsEarned += points;
    this.checkTierEligibility();
    return this.save();
  };

  LoyaltyAccount.prototype.redeemPoints = function (points) {
    if (this.pointsBalance < points) {
      throw new Error("Insufficient points balance");
    }
    this.pointsBalance -= points;
    this.totalPointsRedeemed += points;
    return this.save();
  };

  LoyaltyAccount.prototype.checkTierEligibility = function () {
    const silverThreshold = 0;
    const goldThreshold = 5000;
    const platinumThreshold = 15000;

    let newTier = LOYALTY_TIER.SILVER;

    if (this.totalPointsEarned >= platinumThreshold) {
      newTier = LOYALTY_TIER.PLATINUM;
    } else if (this.totalPointsEarned >= goldThreshold) {
      newTier = LOYALTY_TIER.GOLD;
    }

    if (newTier !== this.tier) {
      this.tier = newTier;
      this.lastTierUpdate = new Date();
      return true; // Tier upgraded
    }

    return false; // No tier change
  };

  LoyaltyAccount.prototype.getTierProgress = function () {
    const thresholds = {
      [LOYALTY_TIER.SILVER]: {
        current: 0,
        next: 5000,
        nextTier: LOYALTY_TIER.GOLD,
      },
      [LOYALTY_TIER.GOLD]: {
        current: 5000,
        next: 15000,
        nextTier: LOYALTY_TIER.PLATINUM,
      },
      [LOYALTY_TIER.PLATINUM]: { current: 15000, next: null, nextTier: null },
    };

    const tierInfo = thresholds[this.tier];
    if (!tierInfo.next) {
      return {
        currentTier: this.tier,
        nextTier: null,
        pointsNeeded: 0,
        progressPercentage: 100,
      };
    }

    const pointsNeeded = tierInfo.next - this.totalPointsEarned;
    const progressPercentage = Math.min(
      ((this.totalPointsEarned - tierInfo.current) /
        (tierInfo.next - tierInfo.current)) *
        100,
      100,
    );

    return {
      currentTier: this.tier,
      nextTier: tierInfo.nextTier,
      pointsNeeded: Math.max(pointsNeeded, 0),
      progressPercentage: Math.round(progressPercentage * 100) / 100,
    };
  };

  // Class methods
  LoyaltyAccount.findByCustomerId = function (customerId) {
    return this.findOne({ where: { customerId } });
  };

  LoyaltyAccount.getTopCustomers = function (limit = 10) {
    return this.findAll({
      order: [["points_balance", "DESC"]],
      limit,
    });
  };

  return LoyaltyAccount;
};

module.exports = createLoyaltyAccountModel;
