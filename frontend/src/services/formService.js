/**
 * Form API Service
 * Handles all form-related API calls
 */

import axios from '../config/axios';
import supabase from '../config/supabase';
import { isFormActive } from '../utils/helpers';

const formService = {
    /**
     * Create new form
     */
    createForm: async (formData) => {
        const response = await axios.post('/forms', formData);
        return response;
    },

    /**
     * Get all forms
     */
    getAllForms: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await axios.get(`/forms${params ? '?' + params : ''}`);
        return response;
    },

    /**
     * Get form by ID
     */
    getForm: async (formId, isStudentView = false) => {
        const params = isStudentView ? '?view=student' : '';
        const response = await axios.get(`/forms/${formId}${params}`);
        return response;
    },

    /**
     * Update form
     */
    updateForm: async (formId, updates) => {
        const response = await axios.put(`/forms/${formId}`, updates);
        return response;
    },

    /**
     * Delete form
     */
    deleteForm: async (formId) => {
        const response = await axios.delete(`/forms/${formId}`);
        return response;
    },

    /**
     * Duplicate form
     */
    duplicateForm: async (formId) => {
        const response = await axios.post(`/forms/${formId}/duplicate`);
        return response;
    },

    /**
     * Change form status
     */
    changeFormStatus: async (formId, status) => {
        const response = await axios.patch(`/forms/${formId}/status`, { status });
        return response;
    },

    /**
     * Get form statistics
     */
    getFormStatistics: async (formId) => {
        const response = await axios.get(`/forms/${formId}/statistics`);
        return response;
    },

    /**
     * Get form directly from Supabase (bypasses Render backend).
     * Used by the public StudentForm page so cold-starts never affect students.
     */
    getFormDirect: async (formId) => {
        const { data: form, error } = await supabase
            .from('forms')
            .select('*')
            .eq('form_id', formId)
            .single();

        if (error || !form) {
            throw new Error('Form not found');
        }

        // Parse JSON fields that Supabase may return as strings
        const parseJson = (val, fallback) => {
            if (!val) return fallback;
            if (typeof val === 'string') { try { return JSON.parse(val); } catch { return fallback; } }
            return val;
        };

        form.sections             = parseJson(form.sections, []);
        form.settings             = parseJson(form.settings, {});
        form.general_details_config = parseJson(form.general_details_config, { fields: [] });

        // Merge general_detail_fields back into settings (mirrors backend _withGeneralDetails)
        form.settings.general_detail_fields = form.general_details_config?.fields || [];

        if (!isFormActive(form)) {
            throw new Error('Form is not accepting responses');
        }

        return { success: true, data: { form } };
    }
};

export default formService;
