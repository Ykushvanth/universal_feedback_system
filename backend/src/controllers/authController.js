/**
 * Authentication Controller
 * Handle authentication-related HTTP requests
 */

const AuthService = require('../services/authService');
const { successResponse, errorResponse, createdResponse } = require('../utils/responseFormatter');
const { logger } = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

class AuthController {
    /**
     * Register new user
     * POST /api/auth/register
     */
    static async register(req, res, next) {
        try {
            const { email, password, name } = req.body;

            const result = await AuthService.register({
                email,
                password,
                name,
                role: 'admin' // Default role for new registrations
            });

            return createdResponse(res, result, 'User registered successfully');
        } catch (error) {
            logger.error('Registration controller error:', error);

            if (error.message.includes('already exists')) {
                return next(new AppError(error.message, 400));
            }

            return next(new AppError('Registration failed', 500));
        }
    }

    /**
     * Login user
     * POST /api/auth/login
     */
    static async login(req, res, next) {
        try {
            const { email, password } = req.body;

            const result = await AuthService.login(email, password);

            return successResponse(res, result, 'Login successful');
        } catch (error) {
            logger.error('Login controller error:', error);

            if (error.message.includes('Invalid') || error.message.includes('inactive')) {
                return next(new AppError(error.message, 401));
            }

            return next(new AppError('Login failed', 500));
        }
    }

    /**
     * Get current user profile
     * GET /api/auth/me
     */
    static async getProfile(req, res, next) {
        try {
            const user = await AuthService.getProfile(req.user.id);

            return successResponse(res, { user }, 'Profile retrieved successfully');
        } catch (error) {
            logger.error('Get profile controller error:', error);
            return next(new AppError('Failed to retrieve profile', 500));
        }
    }

    /**
     * Update user profile
     * PUT /api/auth/profile
     */
    static async updateProfile(req, res, next) {
        try {
            const { name, email, password } = req.body;
            const updates = {};

            if (name) updates.name = name;
            if (email) updates.email = email;
            if (password) updates.password = password;

            const user = await AuthService.updateProfile(req.user.id, updates);

            return successResponse(res, { user }, 'Profile updated successfully');
        } catch (error) {
            logger.error('Update profile controller error:', error);
            return next(new AppError('Failed to update profile', 500));
        }
    }

    /**
     * Refresh access token
     * POST /api/auth/refresh
     */
    static async refreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return next(new AppError('Refresh token is required', 400));
            }

            const result = await AuthService.refreshAccessToken(refreshToken);

            return successResponse(res, result, 'Token refreshed successfully');
        } catch (error) {
            logger.error('Refresh token controller error:', error);
            return next(new AppError('Failed to refresh token', 401));
        }
    }

    /**
     * Logout user
     * POST /api/auth/logout
     */
    static async logout(req, res, next) {
        try {
            // In a stateless JWT system, logout is handled client-side
            // Here we just return success - client should delete tokens
            return successResponse(res, null, 'Logout successful');
        } catch (error) {
            logger.error('Logout controller error:', error);
            return next(new AppError('Logout failed', 500));
        }
    }
}

module.exports = AuthController;
