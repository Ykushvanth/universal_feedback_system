/**
 * Feedback System - Server Entry Point
 * Professional feedback collection and analysis system
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = require('./src/app');
const { logger } = require('./src/utils/logger');
const { testDatabaseConnection } = require('./src/config/database');

// Configuration
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Start server
 */
async function startServer() {
    try {
        // Test database connection
        logger.info('Testing database connection...');
        await testDatabaseConnection();
        logger.info('✓ Database connection successful');

        // Start Express server
        const server = app.listen(PORT, () => {
            logger.info('='.repeat(80));
            logger.info(`🚀 Feedback System Backend Server`);
            logger.info(`   Environment: ${NODE_ENV}`);
            logger.info(`   Port: ${PORT}`);
            logger.info(`   URL: http://localhost:${PORT}`);
            logger.info(`   API Docs: http://localhost:${PORT}/api-docs`);
            logger.info('='.repeat(80));
        });

        // Graceful shutdown
        const gracefulShutdown = async (signal) => {
            logger.info(`\n${signal} received. Starting graceful shutdown...`);
            
            server.close(async () => {
                logger.info('HTTP server closed');
                
                // Close database connection
                try {
                    const db = require('./src/config/database');
                    await db.pool.end();
                    logger.info('Database connection closed');
                } catch (error) {
                    logger.error('Error closing database:', error);
                }
                
                logger.info('Graceful shutdown completed');
                process.exit(0);
            });

            // Force shutdown after 10 seconds
            setTimeout(() => {
                logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };

        // Handle shutdown signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();
