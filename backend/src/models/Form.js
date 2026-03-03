/**
 * Form Model
 * Handles all form-related database operations
 */

const { supabase } = require('../config/database');
const { logger } = require('../utils/logger');
const { generateFormId } = require('../utils/helpers');

class FormModel {
    /**
     * Create new form
     */
    static async create(formData, userId) {
        try {
            const formId = generateFormId();

            // Extract general_detail_fields from settings if it exists
            const general_details_config = {
                fields: formData.settings?.general_detail_fields || []
            };

            // Remove general_detail_fields from settings to avoid duplication
            const settings = { ...formData.settings };
            delete settings.general_detail_fields;

            const isDraft = formData.status === 'draft';

            const { data, error } = await supabase
                .from('forms')
                .insert([{
                    form_id: formId,
                    title: formData.title,
                    description: formData.description,
                    sections: formData.sections,
                    settings: settings,
                    general_details_config: general_details_config,
                    created_by: userId,
                    is_active: !isDraft,
                    published_at: isDraft ? null : new Date().toISOString()
                }])
                .select()
                .single();

            if (error) {
                throw error;
            }

            return this._withGeneralDetails(data);
        } catch (error) {
            logger.error('Error creating form:', error);
            throw error;
        }
    }

    /**
     * Safely parse a value that may be a JSON string or already an object/array.
     */
    static _parseJsonField(val, fallback = null) {
        if (val === null || val === undefined) return fallback;
        if (typeof val === 'string') {
            try { return JSON.parse(val); } catch { return fallback; }
        }
        return val;
    }

    /**
     * Merge general_details_config back into settings.general_detail_fields.
     * Also safely parses any fields that Supabase may return as JSON strings
     * (happens when columns are TEXT instead of JSONB).
     */
    static _withGeneralDetails(form) {
        if (!form) return form;
        const settings             = this._parseJsonField(form.settings, {});
        const generalDetailsConfig = this._parseJsonField(form.general_details_config, { fields: [] });
        const sections             = this._parseJsonField(form.sections, []);
        return {
            ...form,
            sections,
            settings: {
                ...settings,
                general_detail_fields: generalDetailsConfig.fields || []
            },
            general_details_config: generalDetailsConfig
        };
    }

    /**
     * Get form by ID
     */
    static async findById(formId) {
        try {
            const { data, error } = await supabase
                .from('forms')
                .select('*')
                .eq('form_id', formId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return this._withGeneralDetails(data);
        } catch (error) {
            logger.error('Error finding form by ID:', error);
            throw error;
        }
    }

    /**
     * Get all forms
     */
    static async getAll(filters = {}) {
        try {
            let query = supabase
                .from('forms')
                .select('*');

            if (filters.created_by) {
                query = query.eq('created_by', filters.created_by);
            }

            if (filters.is_active !== undefined) {
                query = query.eq('is_active', filters.is_active);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            return (data || []).map(form => this._withGeneralDetails(form));
        } catch (error) {
            logger.error('Error getting all forms:', error);
            throw error;
        }
    }

    /**
     * Update form
     */
    static async update(formId, updates) {
        try {
            // Extract general_detail_fields from settings (same as create)
            const updatePayload = { ...updates };

            // Handle status field for draft/active transitions
            if (updatePayload.status === 'draft') {
                updatePayload.is_active = false;
            } else if (updatePayload.status === 'active') {
                updatePayload.is_active = true;
                if (!updatePayload.published_at) {
                    updatePayload.published_at = new Date().toISOString();
                }
            }
            delete updatePayload.status;

            if (updatePayload.settings && updatePayload.settings.general_detail_fields !== undefined) {
                updatePayload.general_details_config = {
                    fields: updatePayload.settings.general_detail_fields || []
                };
                const cleanSettings = { ...updatePayload.settings };
                delete cleanSettings.general_detail_fields;
                updatePayload.settings = cleanSettings;
            }

            const { data, error } = await supabase
                .from('forms')
                .update({
                    ...updatePayload,
                    updated_at: new Date().toISOString()
                })
                .eq('form_id', formId)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return this._withGeneralDetails(data);
        } catch (error) {
            logger.error('Error updating form:', error);
            throw error;
        }
    }

    /**
     * Delete form (hard delete)
     */
    static async delete(formId) {
        try {
            const { error } = await supabase
                .from('forms')
                .delete()
                .eq('form_id', formId);

            if (error) {
                throw error;
            }

            return true;
        } catch (error) {
            logger.error('Error deleting form:', error);
            throw error;
        }
    }

    /**
     * Duplicate form
     */
    static async duplicate(formId, userId) {
        try {
            // Get original form
            const originalForm = await this.findById(formId);
            if (!originalForm) {
                throw new Error('Form not found');
            }

            // Create duplicate with new ID
            const newFormId = generateFormId();

            // Strip general_detail_fields from settings (stored separately in general_details_config)
            const cleanSettings = { ...originalForm.settings };
            delete cleanSettings.general_detail_fields;

            const { data, error } = await supabase
                .from('forms')
                .insert([{
                    form_id: newFormId,
                    title: `${originalForm.title} (Copy)`,
                    description: originalForm.description,
                    sections: originalForm.sections,
                    settings: cleanSettings,
                    general_details_config: originalForm.general_details_config,
                    created_by: userId,
                    is_active: false,
                    published_at: null
                }])
                .select()
                .single();

            if (error) {
                throw error;
            }

            return this._withGeneralDetails(data);
        } catch (error) {
            logger.error('Error duplicating form:', error);
            throw error;
        }
    }

    /**
     * Get form statistics
     */
    static async getStatistics(formId) {
        try {
            const { data, error } = await supabase
                .from('forms')
                .select('response_count, created_at, updated_at')
                .eq('form_id', formId)
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            logger.error('Error getting form statistics:', error);
            throw error;
        }
    }
}

module.exports = FormModel;
