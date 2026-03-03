/**
 * Authentication Service
 * Business logic for authentication
 */

const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');
const { logger } = require('../utils/logger');
const config = require('../config/env');

class AuthService {
    /**
     * Generate JWT token
     */
    static generateToken(user) {
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role
        };

        return jwt.sign(payload, config.jwt.secret, {
            expiresIn: config.jwt.expiresIn
        });
    }

    /**
     * Generate refresh token
     */
    static generateRefreshToken(user) {
        const payload = {
            id: user.id,
            email: user.email
        };

        return jwt.sign(payload, config.jwt.refreshSecret, {
            expiresIn: config.jwt.refreshExpiresIn
        });
    }

    /**
     * Verify token
     */
    static verifyToken(token) {
        try {
            return jwt.verify(token, config.jwt.secret);
        } catch (error) {
            logger.error('Token verification failed:', error);
            return null;
        }
    }

    /**
     * Verify refresh token
     */
    static verifyRefreshToken(token) {
        try {
            return jwt.verify(token, config.jwt.refreshSecret);
        } catch (error) {
            logger.error('Refresh token verification failed:', error);
            return null;
        }
    }

    /**
     * Register new user
     */
    static async register(userData) {
        try {
            // Check if user already exists
            const existingUser = await UserModel.findByEmail(userData.email);
            if (existingUser) {
                throw new Error('User with this email already exists');
            }

            // Create user
            const user = await UserModel.create(userData);

            // Remove password from response
            delete user.password_hash;

            // Generate tokens
            const token = this.generateToken(user);
            const refreshToken = this.generateRefreshToken(user);

            logger.info(`New user registered: ${user.email}`);

            return {
                user,
                token,
                refreshToken
            };
        } catch (error) {
            logger.error('Registration error:', error);
            throw error;
        }
    }

    /**
     * Login user
     */
    static async login(email, password) {
        try {
            // Find user
            const user = await UserModel.findByEmail(email);
            if (!user) {
                throw new Error('Invalid email or password');
            }

            // Check if user is active
            if (!user.is_active) {
                throw new Error('Account is inactive. Please contact administrator.');
            }

            // Verify password
            const isValidPassword = await UserModel.verifyPassword(password, user.password_hash);
            if (!isValidPassword) {
                throw new Error('Invalid email or password');
            }

            // Update last login
            await UserModel.updateLastLogin(user.id);

            // Remove password from response
            delete user.password_hash;

            // Generate tokens
            const token = this.generateToken(user);
            const refreshToken = this.generateRefreshToken(user);

            logger.info(`User logged in: ${user.email}`);

            return {
                user,
                token,
                refreshToken
            };
        } catch (error) {
            logger.error('Login error:', error);
            throw error;
        }
    }

    /**
     * Get user profile
     */
    static async getProfile(userId) {
        try {
            const user = await UserModel.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            delete user.password_hash;
            return user;
        } catch (error) {
            logger.error('Get profile error:', error);
            throw error;
        }
    }

    /**
     * Update profile
     */
    static async updateProfile(userId, updates) {
        try {
            const user = await UserModel.update(userId, updates);
            delete user.password_hash;

            logger.info(`User profile updated: ${user.email}`);

            return user;
        } catch (error) {
            logger.error('Update profile error:', error);
            throw error;
        }
    }

    /**
     * Refresh access token
     */
    static async refreshAccessToken(refreshToken) {
        try {
            const decoded = this.verifyRefreshToken(refreshToken);
            if (!decoded) {
                throw new Error('Invalid refresh token');
            }

            const user = await UserModel.findById(decoded.id);
            if (!user || !user.is_active) {
                throw new Error('User not found or inactive');
            }

            const newToken = this.generateToken(user);

            return { token: newToken };
        } catch (error) {
            logger.error('Refresh token error:', error);
            throw error;
        }
    }
}

module.exports = AuthService;
