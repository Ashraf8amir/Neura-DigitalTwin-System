const crypto = require('crypto');
const config = require('../config/config');

const normalizePart = (value) => {
    if (value === null || value === undefined || value === '') return 'na';

    return String(value).trim().replace(/\s+/g, '_').replace(/:/g, '_').toLowerCase();
};

const buildCacheKey = (...parts) => [config.redisPrefix, ...parts.map(normalizePart)].join(':');

const stableStringify = (value) => {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(',')}]`;
    }

    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
};

const hashQuery = (payload) => crypto.createHash('sha1').update(stableStringify(payload)).digest('hex');

const safeLogKey = (key) => {
    const normalized = String(key || '');
    if (normalized.length <= 140) return normalized

    const shortHash = crypto.createHash('sha1').update(normalized).digest('hex').slice(0, 12);
    return `${normalized.slice(0, 80)}...#${shortHash}`;
};

module.exports = {
    buildCacheKey,
    hashQuery,
    safeLogKey,
    normalizePart
};