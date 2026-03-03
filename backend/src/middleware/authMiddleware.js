/**
 * Authentication Middleware
 * Protect routes and verify JWT tokens
 */

const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { unauthorizedResponse, forbiddenResponse } = require('../utils/responseFormatter');
const { logger } = require('../utils/logger');
const UserModel = require('../models/User');

/**
 * Verify JWT token middleware
 */
const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return unauthorizedResponse(res, 'No token provided');
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, config.jwt.secret);

        // Check if user still exists and is active
        const user = await UserModel.findById(decoded.id);

        if (!user) {
            return unauthorizedResponse(res, 'User not found');
        }

        if (!user.is_active) {
            return unauthorizedResponse(res, 'Account is inactive');
        }

        // Attach user to request
        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        };

        next();
    } catch (error) {
        logger.error('Authentication error:', error);

        if (error.name === 'JsonWebTokenError') {
            return unauthorizedResponse(res, 'Invalid token');
        }

        if (error.name === 'TokenExpiredError') {
            return unauthorizedResponse(res, 'Token expired');
        }

        return unauthorizedResponse(res, 'Authentication failed');
    }
};

/**
 * Check if user has required role
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return unauthorizedResponse(res, 'User not authenticated');
        }

        if (!allowedRoles.includes(req.user.role)) {
            return forbiddenResponse(res, 'Insufficient permissions');
        }

        next();
    };
};

/**
 * Optional authentication - attaches user if token is valid but doesn't fail if not
 */
const optionalAuthenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, config.jwt.secret);

            const user = await UserModel.findById(decoded.id);

            if (user && user.is_active) {
                req.user = {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                };
            }
        }

        next();
    } catch (error) {
        // Silently continue without user
        next();
    }
};

module.exports = {
    authenticate,
    authorize,
    optionalAuthenticate
};
