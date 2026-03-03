/**
 * Form API Service
 * Handles all form-related API calls
 */

import axios from '../config/axios';

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
    }
};

export default formService;
