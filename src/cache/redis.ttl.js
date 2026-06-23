const config = require('../config/config');

const fallbackTtl = Number(config.redisDefaultTTLSeconds) || 60;

const cacheTTL = {
    appointments: {
        availableSlots: 20,
        list: 30,
        count: 60,
        statistics: 300,
        today: 20,
        patientBrief: 900
    },
    fallback: fallbackTtl
};

module.exports = cacheTTL;