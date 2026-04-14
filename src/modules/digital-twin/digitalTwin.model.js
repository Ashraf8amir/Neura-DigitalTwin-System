const mongoose = require('mongoose');
const { digitalTwinConstants } = require('./digitalTwin.constant');

const digitalTwinSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },

  currentState: {
    overallHealthScore: {
      score: {
        type: Number,
        min: [0, "Health score cannot be negative"],
        max: [100, "Health score cannot exceed 100"]
      },
      category: {
        type: String,
        enum: Object.values(digitalTwinConstants.categoryHealthScore),
        default: digitalTwinConstants.categoryHealthScore.FAIR
      },
      calculatedAt: Date
    },

    vitals: {
      weight: {
        value: Number,
        trend: {
          type: String,
          enum: Object.values(digitalTwinConstants.weightTrend),
          default: digitalTwinConstants.weightTrend.UNKNOWN
        }
      },
      height: Number,
      bmi: {
        value: Number,
        category: {
          type: String,
          enum: Object.values(digitalTwinConstants.bmiCategory),
          default: digitalTwinConstants.bmiCategory.UNKNOWN
        }
      },
    },

    affectedOrgans: [
      {
        organ: {
          type: String,
          enum: Object.values(digitalTwinConstants.organTypes),
          required: true
        },
        impact_type: {
          type: String,
          enum: Object.values(digitalTwinConstants.organImpactTypes),
          default: digitalTwinConstants.organImpactTypes.SECONDARY
        },
        risk_level: {
          type: Number,
          min: [0, "Risk level cannot be negative"],
          max: [1, "Risk level cannot exceed 1"]
        },
        damage_intensity: {
          type: Number,
          min: [0, "Damage intensity cannot be negative"],
          max: [1, "Damage intensity cannot exceed 1"]
        }
      }
    ],

    lastUpdated: {
      type: Date,
      default: Date.now
    },
  },

  riskScores: {
    cardiovascularRisk: {
      score: {
        type: Number,
        min: [0, "Risk score cannot be negative"],
        max: [100, "Risk score cannot exceed 100"]
      },
      level: {
        type: String,
        enum: Object.values(digitalTwinConstants.riskScore),
        default: digitalTwinConstants.riskScore.LOW
      },
      factors: [{
        factor: String,
        impact: {
          type: String,
          enum: Object.values(digitalTwinConstants.riskFactorImpact)
        },
        _id: false
      }],
      calculatedAt: Date
    },

    diabetesRisk: {
      score: {
        type: Number,
        min: [0, "Risk score cannot be negative"],
        max: [100, "Risk score cannot exceed 100"]
      },
      level: {
        type: String,
        enum: Object.values(digitalTwinConstants.riskScore),
        default: digitalTwinConstants.riskScore.LOW
      },
      factors: [{
        factor: String,
        impact: {
          type: String,
          enum: Object.values(digitalTwinConstants.riskFactorImpact),
        },
        _id: false
      }],
      calculatedAt: Date
    },

    strokeRisk: {
      score: {
        type: Number,
        min: [0, "Risk score cannot be negative"],
        max: [100, "Risk score cannot exceed 100"]
      },
      level: {
        type: String,
        enum: Object.values(digitalTwinConstants.riskScore),
        default: digitalTwinConstants.riskScore.LOW
      },
      calculatedAt: Date
    }
  },

  riskPredictions: [{
    condition: {
      type: String
    },
    probability: {
      type: Number,
      min: [0, "Probability cannot be negative"],
      max: [1, "Probability cannot exceed 1"]
    },
    timeframe: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  recommendations: [{
    category: {
      type: String
    },
    priority: {
      type: String,
      enum: Object.values(digitalTwinConstants.recommendationPriority),
      default: digitalTwinConstants.recommendationPriority.MEDIUM
    },
    recommendation: {
      type: String,
      trim: true
    },
    reason: {
      type: String,
      trim: true
    },
    expectedImpact: {
      type: String,
      trim: true
    },
    generatedAt: {
      type: Date,
      default: Date.now
    }
  }],

  alerts: [{
    alertType: {
      type: String,
      enum: Object.values(digitalTwinConstants.alertLevels),
      required: true
    },
    category: {
      type: String
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    severity: {
      type: String,
      enum: Object.values(digitalTwinConstants.alertSeverity),
      default: digitalTwinConstants.alertSeverity.MEDIUM
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  isActive: {
    type: Boolean,
    default: true
  },

  lastSyncedWithPatient: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});


digitalTwinSchema.index({ 'currentState.lastUpdated': -1 });
digitalTwinSchema.index({ isActive: 1 });


digitalTwinSchema.methods.updateCurrentState = function(newVitals) {
  this.currentState.vitals = {
    ...this.currentState.vitals,
    ...newVitals
  };
  this.currentState.lastUpdated = new Date();
  return this.save();
};

digitalTwinSchema.methods.addRiskPredictions = function(predictionData) {
  this.riskPredictions.push({
    ...predictionData,
    createdAt: new Date()
  });
  return this.save();
};

digitalTwinSchema.methods.addAlert = function(alertData) {
  this.alerts.push({
    ...alertData,
    createdAt: new Date()
  });
  return this.save();
};


const transformFn = (doc, ret) => {
  delete ret._id;
  delete ret.__v;
  return ret;
};

digitalTwinSchema.set("toJSON", { virtuals: true, transform: transformFn });
digitalTwinSchema.set("toObject", { virtuals: true, transform: transformFn });


const DigitalTwin = mongoose.model('DigitalTwin', digitalTwinSchema);

module.exports = DigitalTwin;
