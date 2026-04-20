exports.digitalTwinConstants = Object.freeze({
    LLAMA_MODEL: 'llama-3.3-70b-versatile',
    FALLBACK_MODEL: 'llama-3.1-8b-instant',
    LLAMA_MAX_RETRIES: 2,
    LLAMA_TRANSIENT_RETRIES: 3,

    categoryHealthScore: {
        EXCELLENT: 'excellent',
        VERY_GOOD: 'very_good',
        GOOD: 'good',
        FAIR: 'fair',
        POOR: 'poor'
    },

    weightTrend: {
        INCREASING: 'increasing',
        STABLE: 'stable',
        DECREASING: 'decreasing',
        UNKNOWN: 'unknown'
    },

    wightTrend: {
        INCREASING: 'increasing',
        STABLE: 'stable',
        DECREASING: 'decreasing',
        UNKNOWN: 'unknown'
    },

    bmiCategory: {
        UNDERWEIGHT: 'underweight',
        NORMAL: 'normal',
        OVERWEIGHT: 'overweight',
        OBESE: 'obese',
        UNKNOWN: 'unknown'
    },

    organTypes: {
        HEART: 'heart',
        LUNG: 'lung',
        KIDNEYS: 'kidneys',
        LIVER: 'liver',
        BRAIN: 'brain',
        PANCREAS: 'pancreas',
        STOMACH: 'stomach',
        INTESTINES_LARGE: 'intestinesLarge',
        INTESTINES_SMALL: 'intestinesSmall',
        BlaDDER: 'bladder'
    },

    organImpactTypes: {
        PRIMARY: 'primary',
        SECONDARY: 'secondary'
    },

    riskScore: {
        LOW: 'low',
        MODERATE: 'moderate',
        HIGH: 'high',
        VERY_HIGH: 'very_high'
    },

    riskFactorImpact: {
        LOW: 'low',
        MODERATE: 'moderate',
        HIGH: 'high'
    },

    recommendationPriority: {
        LOW: 'low',
        MEDIUM: 'medium',
        HIGH: 'high',
        URGENT: 'urgent'
    },

    alertLevels: {
        WARNING: 'warning',
        INFO: 'info',
        CRITICAL: 'critical'
    },

    alertSeverity: {
        LOW: 'low',
        MEDIUM: 'medium',
        HIGH: 'high',
        CRITICAL: 'critical'
    }
});
