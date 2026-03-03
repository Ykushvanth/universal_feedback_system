/**
 * Form Service
 * Business logic for form management
 */

const FormModel = require('../models/Form');
const { logger } = require('../utils/logger');
const { calculateFormScore, isFormActive } = require('../utils/helpers');

class FormService {
    /**
     * Create new form
     */
    static async createForm(formData, userId) {
        try {
            // Calculate total max score if form has scoring
            const sections = formData.sections || [];
            const totalMaxScore = calculateFormScore(sections);

            // Add calculated fields to settings
            if (!formData.settings) {
                formData.settings = {};
            }
            formData.settings.total_max_score = totalMaxScore;

            const form = await FormModel.create(formData, userId);

            logger.info(`Form created: ${form.form_id} by user ${userId}`);

            return form;
        } catch (error) {
            logger.error('Create form service error:', error);
            throw error;
        }
    }

    /**
     * Get form by ID
     */
    static async getFormById(formId) {
        try {
            const form = await FormModel.findById(formId);

            if (!form) {
                throw new Error('Form not found');
            }

            return form;
        } catch (error) {
            logger.error('Get form service error:', error);
            throw error;
        }
    }

    /**
     * Get all forms
     */
    static async getAllForms(filters = {}, userId = null) {
        try {
            // Add user filter if provided
            if (userId) {
                filters.created_by = userId;
            }

            const forms = await FormModel.getAll(filters);

            return forms;
        } catch (error) {
            logger.error('Get all forms service error:', error);
            throw error;
        }
    }

    /**
     * Update form
     */
    static async updateForm(formId, updates, userId) {
        try {
            // Check if form exists
            const existingForm = await FormModel.findById(formId);

            if (!existingForm) {
                throw new Error('Form not found');
            }

            // Check ownership
            if (existingForm.created_by !== userId) {
                throw new Error('Unauthorized to update this form');
            }

            // Recalculate max score if sections are updated
            if (updates.sections) {
                const totalMaxScore = calculateFormScore(updates.sections);
                if (!updates.settings) {
                    updates.settings = existingForm.settings || {};
                }
                updates.settings.total_max_score = totalMaxScore;
            }

            const updatedForm = await FormModel.update(formId, updates);

            logger.info(`Form updated: ${formId} by user ${userId}`);

            return updatedForm;
        } catch (error) {
            logger.error('Update form service error:', error);
            throw error;
        }
    }

    /**
     * Delete form
     */
    static async deleteForm(formId, userId) {
        try {
            // Check if form exists
            const existingForm = await FormModel.findById(formId);

            if (!existingForm) {
                throw new Error('Form not found');
            }

            // Check ownership
            if (existingForm.created_by !== userId) {
                throw new Error('Unauthorized to delete this form');
            }

            await FormModel.delete(formId);

            logger.info(`Form deleted: ${formId} by user ${userId}`);

            return true;
        } catch (error) {
            logger.error('Delete form service error:', error);
            throw error;
        }
    }

    /**
     * Duplicate form
     */
    static async duplicateForm(formId, userId) {
        try {
            // Check if form exists
            const existingForm = await FormModel.findById(formId);

            if (!existingForm) {
                throw new Error('Form not found');
            }

            // Check ownership
            if (existingForm.created_by !== userId) {
                throw new Error('Unauthorized to duplicate this form');
            }

            const duplicatedForm = await FormModel.duplicate(formId, userId);

            logger.info(`Form duplicated: ${formId} -> ${duplicatedForm.form_id} by user ${userId}`);

            return duplicatedForm;
        } catch (error) {
            logger.error('Duplicate form service error:', error);
            throw error;
        }
    }

    /**
     * Change form status
     */
    static async changeFormStatus(formId, status, userId) {
        try {
            // Check if form exists
            const existingForm = await FormModel.findById(formId);

            if (!existingForm) {
                throw new Error('Form not found');
            }

            // Check ownership
            if (existingForm.created_by !== userId) {
                throw new Error('Unauthorized to change status of this form');
            }

            // Validate status
            const validStatuses = ['draft', 'active', 'closed'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid status');
            }

            const updates = { is_active: status === 'active' };
            // Set published_at the first time the form goes active
            if (status === 'active' && !existingForm.published_at) {
                updates.published_at = new Date().toISOString();
            }
            const updatedForm = await FormModel.update(formId, updates);

            logger.info(`Form status changed: ${formId} -> ${status} by user ${userId}`);

            return updatedForm;
        } catch (error) {
            logger.error('Change form status service error:', error);
            throw error;
        }
    }

    /**
     * Get form for student view
     */
    static async getFormForStudent(formId) {
        try {
            const form = await FormModel.findById(formId);

            if (!form) {
                throw new Error('Form not found');
            }

            // Check if form is active
            if (!isFormActive(form)) {
                throw new Error('Form is not accepting responses');
            }

            // Remove sensitive data
            const studentView = {
                form_id: form.form_id,
                title: form.title,
                description: form.description,
                sections: form.sections,
                settings: {
                    ...form.settings,
                    // Remove admin-only settings
                },
                created_at: form.created_at
            };

            return studentView;
        } catch (error) {
            logger.error('Get form for student service error:', error);
            throw error;
        }
    }

    /**
     * Get form statistics
     */
    static async getFormStatistics(formId, userId) {
        try {
            // Check if form exists and user owns it
            const form = await FormModel.findById(formId);

            if (!form) {
                throw new Error('Form not found');
            }

            if (form.created_by !== userId) {
                throw new Error('Unauthorized to view statistics');
            }

            const stats = await FormModel.getStatistics(formId);

            return stats;
        } catch (error) {
            logger.error('Get form statistics service error:', error);
            throw error;
        }
    }
}

module.exports = FormService;
