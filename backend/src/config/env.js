/**
 * Environment Configuration and Validation
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

/**
 * Validate required environment variables
 */
function validateEnv() {
    const required = [
        'NODE_ENV',
        'PORT',
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'JWT_SECRET',
        'FRONTEND_URL'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(', ')}\n` +
            'Please check your .env file'
        );
    }
}

// Validate on module load
validateEnv();

/**
 * Application configuration
 */
const config = {
    // Environment
    env: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    
    // Server
    port: parseInt(process.env.PORT) || 5000,
    baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`,
    
    // Database (Supabase)
    supabase: {
        url: process.env.SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    
    // JWT
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRE || '7d',
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
    },
    
    // CORS
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: process.env.CORS_CREDENTIALS === 'true'
    },
    
    // Email
    email: {
        service: process.env.EMAIL_SERVICE || 'gmail',
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD,
        from: process.env.EMAIL_FROM || 'noreply@feedbacksystem.com'
    },
    
    // AI Analysis
    ai: {
        apiUrl: process.env.AI_ANALYSIS_API_URL,
        enabled: process.env.AI_ANALYSIS_ENABLED === 'true',
        timeout: parseInt(process.env.AI_ANALYSIS_TIMEOUT) || 30000
    },
    
    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    },
    
    // File Upload
    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760,
        uploadDir: process.env.UPLOAD_DIR || './uploads'
    },
    
    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        filePath: process.env.LOG_FILE_PATH || './logs/app.log'
    },
    
    // Security
    security: {
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
        sessionSecret: process.env.SESSION_SECRET
    },
    
    // Frontend
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    
    // Admin
    admin: {
        email: process.env.ADMIN_EMAIL || 'admin@klu.ac.in',
        password: process.env.ADMIN_PASSWORD || 'Admin@123',
        name: process.env.ADMIN_NAME || 'System Administrator'
    }
};

module.exports = config;
