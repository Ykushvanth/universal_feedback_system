/**
 * Global Error Handler Middleware
 */

const { logger } = require('../utils/logger');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Custom Application Error
 */
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    error.stack = err.stack;

    // Log error
    logger.error('Error occurred:', {
        message: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
    });

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = 'Resource not found';
        error = new AppError(message, HTTP_STATUS.NOT_FOUND);
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        error = new AppError(message, HTTP_STATUS.CONFLICT);
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        error = new AppError(message, HTTP_STATUS.BAD_REQUEST);
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token';
        error = new AppError(message, HTTP_STATUS.UNAUTHORIZED);
    }

    if (err.name === 'TokenExpiredError') {
        const message = 'Token expired';
        error = new AppError(message, HTTP_STATUS.UNAUTHORIZED);
    }

    // Supabase errors
    if (err.code && err.code.startsWith('PGRST')) {
        const message = 'Database operation failed';
        error = new AppError(message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    // Send response
    res.status(error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
};

/**
 * Not found handler
 */
const notFound = (req, res, next) => {
    const error = new AppError(`Route not found - ${req.originalUrl}`, HTTP_STATUS.NOT_FOUND);
    next(error);
};

/**
 * Async handler wrapper
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = {
    AppError,
    errorHandler,
    notFound,
    asyncHandler
};
