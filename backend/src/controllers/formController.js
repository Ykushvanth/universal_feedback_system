/**
 * Form Controller
 * Handle form-related HTTP requests
 */

const FormService = require('../services/formService');
const { successResponse, createdResponse, errorResponse } = require('../utils/responseFormatter');
const { logger } = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

class FormController {
    /**
     * Create new form
     * POST /api/forms
     */
    static async createForm(req, res, next) {
        try {
            const formData = req.body;
            const userId = req.user.id;

            const form = await FormService.createForm(formData, userId);

            return createdResponse(res, { form }, 'Form created successfully');
        } catch (error) {
            logger.error('Create form controller error:', error);
            return next(new AppError('Failed to create form', 500));
        }
    }

    /**
     * Get form by ID
     * GET /api/forms/:formId
     */
    static async getForm(req, res, next) {
        try {
            const { formId } = req.params;
            const isStudent = req.query.view === 'student';

            let form;
            if (isStudent) {
                form = await FormService.getFormForStudent(formId);
            } else {
                form = await FormService.getFormById(formId);

                // Check ownership if not student view
                if (req.user && form.created_by !== req.user.id) {
                    return next(new AppError('Unauthorized to view this form', 403));
                }
            }

            return successResponse(res, { form }, 'Form retrieved successfully');
        } catch (error) {
            logger.error('Get form controller error:', error);

            if (error.message === 'Form not found') {
                return next(new AppError(error.message, 404));
            }

            if (error.message.includes('not accepting responses')) {
                return next(new AppError(error.message, 400));
            }

            return next(new AppError('Failed to retrieve form', 500));
        }
    }

    /**
     * Get all forms
     * GET /api/forms
     */
    static async getAllForms(req, res, next) {
        try {
            const userId = req.user.id;
            const filters = {};

            if (req.query.is_active !== undefined) {
                filters.is_active = req.query.is_active === 'true';
            }

            const forms = await FormService.getAllForms(filters, userId);

            return successResponse(res, { forms, count: forms.length }, 'Forms retrieved successfully');
        } catch (error) {
            logger.error('Get all forms controller error:', error);
            return next(new AppError('Failed to retrieve forms', 500));
        }
    }

    /**
     * Update form
     * PUT /api/forms/:formId
     */
    static async updateForm(req, res, next) {
        try {
            const { formId } = req.params;
            const updates = req.body;
            const userId = req.user.id;

            const form = await FormService.updateForm(formId, updates, userId);

            return successResponse(res, { form }, 'Form updated successfully');
        } catch (error) {
            logger.error('Update form controller error:', error);

            if (error.message === 'Form not found') {
                return next(new AppError(error.message, 404));
            }

            if (error.message.includes('Unauthorized')) {
                return next(new AppError(error.message, 403));
            }

            return next(new AppError('Failed to update form', 500));
        }
    }

    /**
     * Delete form
     * DELETE /api/forms/:formId
     */
    static async deleteForm(req, res, next) {
        try {
            const { formId } = req.params;
            const userId = req.user.id;

            await FormService.deleteForm(formId, userId);

            return successResponse(res, null, 'Form deleted successfully');
        } catch (error) {
            logger.error('Delete form controller error:', error);

            if (error.message === 'Form not found') {
                return next(new AppError(error.message, 404));
            }

            if (error.message.includes('Unauthorized')) {
                return next(new AppError(error.message, 403));
            }

            return next(new AppError('Failed to delete form', 500));
        }
    }

    /**
     * Duplicate form
     * POST /api/forms/:formId/duplicate
     */
    static async duplicateForm(req, res, next) {
        try {
            const { formId } = req.params;
            const userId = req.user.id;

            const form = await FormService.duplicateForm(formId, userId);

            return createdResponse(res, { form }, 'Form duplicated successfully');
        } catch (error) {
            logger.error('Duplicate form controller error:', error);

            if (error.message === 'Form not found') {
                return next(new AppError(error.message, 404));
            }

            if (error.message.includes('Unauthorized')) {
                return next(new AppError(error.message, 403));
            }

            return next(new AppError('Failed to duplicate form', 500));
        }
    }

    /**
     * Change form status
     * PATCH /api/forms/:formId/status
     */
    static async changeFormStatus(req, res, next) {
        try {
            const { formId } = req.params;
            const { status } = req.body;
            const userId = req.user.id;

            if (!status) {
                return next(new AppError('Status is required', 400));
            }

            const form = await FormService.changeFormStatus(formId, status, userId);

            return successResponse(res, { form }, 'Form status updated successfully');
        } catch (error) {
            logger.error('Change form status controller error:', error);

            if (error.message === 'Form not found') {
                return next(new AppError(error.message, 404));
            }

            if (error.message.includes('Unauthorized')) {
                return next(new AppError(error.message, 403));
            }

            if (error.message === 'Invalid status') {
                return next(new AppError(error.message, 400));
            }

            return next(new AppError('Failed to change form status', 500));
        }
    }

    /**
     * Get form statistics
     * GET /api/forms/:formId/statistics
     */
    static async getFormStatistics(req, res, next) {
        try {
            const { formId } = req.params;
            const userId = req.user.id;

            const stats = await FormService.getFormStatistics(formId, userId);

            return successResponse(res, { statistics: stats }, 'Statistics retrieved successfully');
        } catch (error) {
            logger.error('Get form statistics controller error:', error);

            if (error.message === 'Form not found') {
                return next(new AppError(error.message, 404));
            }

            if (error.message.includes('Unauthorized')) {
                return next(new AppError(error.message, 403));
            }

            return next(new AppError('Failed to retrieve statistics', 500));
        }
    }
}

module.exports = FormController;
