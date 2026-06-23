const logger = require('../core/logger');
const config = require('../config/config');
const { getRedisClient, isRedisReady } = require('../config/redis.config');
const { safeLogKey } = require('./cache.keys');

const inFlightRequests = new Map();

const getJSON = async (key) => {
    if (!isRedisReady())  return null;

    try {
        const client = getRedisClient();
        const value = await client.get(key);

        if (value === null) {
            logger.info('CACHE MISS', { key: safeLogKey(key) });
            return null;
        }

        logger.info('CACHE HIT', { key: safeLogKey(key) });
        return JSON.parse(value);
    } catch (error) {
        logger.error('CACHE ERROR', {
            action: 'GET',
            key: safeLogKey(key),
            error: error.message
        });
        return null;
    }
};

const setJSON = async (key, value, ttlSeconds = config.redisDefaultTTLSeconds) => {
    if (!isRedisReady()) return false;

    const ttl = Number(ttlSeconds) > 0 ? Number(ttlSeconds) : config.redisDefaultTTLSeconds;

    try {
        const client = getRedisClient();
        await client.setEx(key, ttl, JSON.stringify(value));
        logger.info('CACHE SET', { key: safeLogKey(key), ttl });
        return true;
    } catch (error) {
        logger.error('CACHE ERROR', {
            action: 'SET',
            key: safeLogKey(key),
            error: error.message
        });
        return false;
    }
};

const delKey = async (key) => {
    if (!isRedisReady()) return 0;
    
    try {
        const client = getRedisClient();
        const deleted = await client.del(key);
        logger.info('CACHE DELETE', { key: safeLogKey(key), deleted });
        return deleted;
    } catch (error) {
        logger.error('CACHE ERROR', {
            action: 'DELETE',
            key: safeLogKey(key),
            error: error.message
        });
        return 0;
    }
};

const delByPrefix = async (prefix) => {
    if (!isRedisReady()) return 0;

    try {
        const client = getRedisClient();
        const pattern = `${prefix}*`;
        let cursor = '0';
        let deletedCount = 0;

        do {
            const result = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
            cursor = String(result.cursor);
            const keys = result.keys || [];

            if (keys.length > 0) {
                deletedCount += await client.del(keys);
            }
        } while (cursor !== '0');

        logger.info('CACHE DELETE', {
            key: `${safeLogKey(prefix)}*`,
            deleted: deletedCount
        });

        return deletedCount;
    } catch (error) {
        logger.error('CACHE ERROR', {
            action: 'DELETE_PREFIX',
            key: `${safeLogKey(prefix)}*`,
            error: error.message
        });
        return 0;
    }
};

const getOrSetCache = async (key, fetcher, ttlSeconds = config.redisDefaultTTLSeconds) => {
    const cachedData = await getJSON(key);

    if (cachedData !== null) {
        return cachedData;
    }

    if (inFlightRequests.has(key)) {
        logger.info('CACHE WAIT', { key: safeLogKey(key) });
        return inFlightRequests.get(key);
    }

    const fetchPromise = (async () => {
        try {
            const freshData = await fetcher();
            if (freshData !== null && freshData !== undefined) {
                await setJSON(key, freshData, ttlSeconds);
            }
            return freshData;
        } catch (error) {
            logger.error('CACHE_FETCH_ERROR', { key, error: error.message });
            throw error; 
        }
    })();

    inFlightRequests.set(key, fetchPromise);

    try {
        return await fetchPromise;
    } finally {
        inFlightRequests.delete(key);
    }
};

module.exports = {
    getJSON,
    setJSON,
    delKey,
    delByPrefix,
    getOrSetCache
};