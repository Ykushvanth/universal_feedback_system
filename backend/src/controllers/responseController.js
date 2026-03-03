/**
 * Response Controller
 * Handle response-related HTTP requests
 */

const ResponseService = require('../services/responseService');
const { successResponse, createdResponse } = require('../utils/responseFormatter');
const { logger } = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

class ResponseController {
    /**
     * Submit new response
     * POST /api/responses/submit
     */
    static async submitResponse(req, res, next) {
        try {
            const responseData = req.body;

            const response = await ResponseService.submitResponse(responseData);

            return createdResponse(res, { response }, 'Response submitted successfully');
        } catch (error) {
            logger.error('Submit response controller error:', error);

            if (error.message === 'Form not found') {
                return next(new AppError(error.message, 404));
            }

            if (error.message.includes('not accepting responses')) {
                return next(new AppError(error.message, 400));
            }

            if (
                error.message.includes('email') ||
                error.message.includes('duplicate') ||
                error.message.includes('already submitted') ||
                error.message.includes('not accepting') ||
                error.message.includes('not found') ||
                error.message.includes('domain')
            ) {
                return next(new AppError(error.message, 400));
            }

            return next(new AppError('Failed to submit response', 500));
        }
    }

    /**
     * Get all responses for a form
     * GET /api/responses/form/:formId
     */
    static async getResponses(req, res, next) {
        try {
            const { formId } = req.params;
            const userId = req.user.id;

            // Extract filters from query params
            const filters = {};
            if (req.query.degree) filters.degree = req.query.degree;
            if (req.query.department) filters.department = req.query.department;
            if (req.query.section) filters.section = req.query.section;
            if (req.query.year) filters.year = req.query.year;

            const responses = await ResponseService.getResponses(formId, filters, userId);

            return successResponse(
                res,
                {
                    responses,
                    count: responses.length,
                    filters: filters
                },
                'Responses retrieved successfully'
            );
        } catch (error) {
            logger.error('Get responses controller error:', error);

            if (error.message === 'Form not found') {
                return next(new AppError(error.message, 404));
            }

            if (error.message.includes('Unauthorized')) {
                return next(new AppError(error.message, 403));
            }

            return next(new AppError('Failed to retrieve responses', 500));
        }
    }

    /**
     * Get response by ID
     * GET /api/responses/:responseId
     */
    static async getResponseById(req, res, next) {
        try {
            const { responseId } = req.params;
            const userId = req.user.id;

            const response = await ResponseService.getResponseById(responseId, userId);

            return successResponse(res, { response }, 'Response retrieved successfully');
        } catch (error) {
            logger.error('Get response by ID controller error:', error);

            if (error.message === 'Response not found') {
                return next(new AppError(error.message, 404));
            }

            if (error.message.includes('Unauthorized')) {
                return next(new AppError(error.message, 403));
            }

            return next(new AppError('Failed to retrieve response', 500));
        }
    }

    /**
     * Get filter options for cascading filters
     * GET /api/responses/form/:formId/filters
     */
    static async getFilterOptions(req, res, next) {
        try {
            const { formId } = req.params;
            const userId = req.user.id;

            const filterOptions = await ResponseService.getFilterOptions(formId, userId);

            return successResponse(res, { filterOptions }, 'Filter options retrieved successfully');
        } catch (error) {
            logger.error('Get filter options controller error:', error);

            if (error.message === 'Form not found') {
                return next(new AppError(error.message, 404));
            }

            if (error.message.includes('Unauthorized')) {
                return next(new AppError(error.message, 403));
            }

            return next(new AppError('Failed to retrieve filter options', 500));
        }
    }

    /**
     * Get response count
     * GET /api/responses/form/:formId/count
     */
    static async getResponseCount(req, res, next) {
        try {
            const { formId } = req.params;
            const userId = req.user.id;

            const count = await ResponseService.getResponseCount(formId, userId);

            return successResponse(res, { count }, 'Response count retrieved successfully');
        } catch (error) {
            logger.error('Get response count controller error:', error);

            if (error.message === 'Form not found') {
                return next(new AppError(error.message, 404));
            }

            if (error.message.includes('Unauthorized')) {
                return next(new AppError(error.message, 403));
            }

            return next(new AppError('Failed to retrieve response count', 500));
        }
    }

    /**
     * Delete a single response
     * DELETE /api/responses/:responseId
     */
    static async deleteResponse(req, res, next) {
        try {
            const { responseId } = req.params;
            const userId = req.user.id;

            await ResponseService.deleteResponse(responseId, userId);

            return successResponse(res, null, 'Response deleted successfully');
        } catch (error) {
            logger.error('Delete response controller error:', error);

            if (error.message === 'Response not found') {
                return next(new AppError(error.message, 404));
            }

            if (error.message.includes('Unauthorized')) {
                return next(new AppError(error.message, 403));
            }

            return next(new AppError('Failed to delete response', 500));
        }
    }

    /**
     * Delete all responses for a form
     * DELETE /api/responses/form/:formId
     */
    static async deleteAllResponses(req, res, next) {
        try {
            const { formId } = req.params;
            const userId = req.user.id;

            await ResponseService.deleteAllResponses(formId, userId);

            return successResponse(res, null, 'All responses deleted successfully');
        } catch (error) {
            logger.error('Delete all responses controller error:', error);

            if (error.message === 'Form not found') {
                return next(new AppError(error.message, 404));
            }

            if (error.message.includes('Unauthorized')) {
                return next(new AppError(error.message, 403));
            }

            return next(new AppError('Failed to delete responses', 500));
        }
    }
}

module.exports = ResponseController;
