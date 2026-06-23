const { createClient, BasicClientSideCache } = require('redis');
const config = require('./config');
const logger = require('../core/logger');

let redisClient = null;
let redisReady = false;

const setupRedisEvents = (client) => {
    client.on('connect', () => {
        logger.info('Attempting to connect to Redis...');
    });

    client.on('ready', () => {
        redisReady = true;
        logger.info('Redis connection is ready');
    });

    client.on('end', () => {
        redisReady = false;
        logger.warn('Redis connection ended');
    });

    client.on('reconnecting', () => {
        redisReady = false;
        logger.warn('Redis reconnecting...');
    });

    client.on('error', (error) => {
        redisReady = false;
        logger.error('Redis client error', { error: error.message });
    });
};

const l1Cache = new BasicClientSideCache({
    ttl: 180000,      
    maxEntries: 200,  
    evictPolicy: 'LRU'
});

const getRedisClient = () => {
    if (!config.redisUrl) {
        return null;
    }

    if (!redisClient) {
        redisClient = createClient({
            url: config.redisUrl,
            RESP: 3,
            clientSideCache: l1Cache,
            socket: {
                reconnectStrategy: retries => Math.min(Math.pow(2, retries) * 50, 3000) + Math.random() * 100
            }
        });

        setupRedisEvents(redisClient);
    }

    return redisClient;
};

const connectRedis = async () => {
    const client = getRedisClient();
    if (!client) {
        logger.warn('REDIS_URL is not configured. Caching is disabled.');
        return null;
    }

    if (client.isOpen) {
        return client;
    }

    try {
        await client.connect();
        return client;
    } catch (error) {
        redisReady = false;
        logger.error('Failed to connect to Redis. Continuing without cache.', {
            error: error.message
        });
        return null;
    }
};

const disconnectRedis = async () => {
    if (!redisClient || !redisClient.isOpen) {
        return;
    }

    try {
        await redisClient.quit();
        logger.info('Redis connection closed gracefully');
    } catch (error) {
        logger.error('Failed to close Redis connection gracefully', {
            error: error.message
        });
    } finally {
        redisClient = null;
        redisReady = false;
    }
};

const isRedisReady = () => Boolean(redisClient && redisClient.isOpen && redisReady);

module.exports = {
    connectRedis,
    disconnectRedis,
    getRedisClient,
    isRedisReady
};