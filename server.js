const http = require('http');
const app = require('./src/app.js');
const config = require('./src/config/config.js');
const connectDB = require('./src/config/database.js');
const { connectRedis, disconnectRedis } = require('./src/config/redis.config.js');
const logger = require('./src/core/logger.js');
const initJobs = require('./src/jobs');
const { initializeSocket, getIO } = require('./src/socket');

let server;

const gracefulShutdown = (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    try {
        const io = getIO();
        if (io) {
            io.close(() => {
                logger.info('Socket.IO server closed.');
            });
        }
    } catch (err) {
        logger.warn('Socket.IO not initialized, skipping socket shutdown.');
    }
    
    if (server) {
        server.close((err) => {
            if (err) {
                logger.error('Error during server shutdown:', { error: err.message });
                process.exit(1);
            }
            
            logger.info('HTTP server closed.');
            disconnectRedis().finally(() => process.exit(0));
        });

        setTimeout(() => {
            logger.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 30000);
    } else {
        disconnectRedis().finally(() => process.exit(0));
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception! Shutting down...', {
        name: err.name,
        message: err.message,
        stack: err.stack
    });
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Promise Rejection! Shutting down...', {
        name: err.name,
        message: err.message,
        stack: err.stack
    });
    
    if (server) {
        server.close(() => {
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
});

const startServer = async () => {
    try {
        if (!config.mongoURL) {
            throw new Error('MONGO_URL environment variable is required');
        }
        
        if (!config.PORT) {
            throw new Error('PORT environment variable is required');
        }

        logger.info('Connecting to MongoDB...', { url: config.mongoURL.replace(/\/\/.*:.*@/, '//***:***@') });
        await connectDB(config.mongoURL);
        logger.info('MongoDB connected successfully');
        
        logger.info('Connecting to Redis cache...');
        await connectRedis();

        logger.info('Initializing scheduled jobs...');
        initJobs();

        const httpServer = http.createServer(app);
        const io = initializeSocket(httpServer);
        app.set('io', io);

        const port = config.PORT;
        server = httpServer.listen(port, () => {
            logger.info(`Server running successfully!`, {
                port: port,
                environment: config.nodeEnv || 'development',
                nodeVersion: process.version,
                platform: process.platform,
                memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`
            });
            process.env.NODE_ENV === 'development' ? logger.info(`http://localhost:${port}`) : logger.info(`Server is live`);
        });

        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                logger.error(`Port ${port} is already in use`);
            } else if (error.code === 'EACCES') {
                logger.error(`Port ${port} requires elevated privileges`);
            } else {
                logger.error('Server error:', { error: error.message });
            }
            process.exit(1);
        });


    } catch (error) {
        logger.error('Failed to start server:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
};


logger.info('Starting application...', {
    nodeEnv: config.nodeEnv || 'development',
    nodeVersion: process.version
});

startServer();