/**
 * Response API Service
 * Handles all response-related API calls
 */

import axios from '../config/axios';

const responseService = {
    /**
     * Submit response (public - no auth required)
     */
    submitResponse: async (responseData) => {
        // For public submission, we need to use axios directly without auth interceptor
        const baseURL = axios.defaults.baseURL;
        const response = await fetch(`${baseURL}/responses/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(responseData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw error;
        }
        
        return response.json();
    },

    /**
     * Get all responses for a form
     */
    getResponses: async (formId, filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await axios.get(`/responses/form/${formId}${params ? '?' + params : ''}`);
        return response;
    },

    /**
     * Get single response by ID
     */
    getResponse: async (responseId) => {
        const response = await axios.get(`/responses/${responseId}`);
        return response;
    },

    /**
     * Get filter options for cascading filters
     */
    getFilterOptions: async (formId) => {
        const response = await axios.get(`/responses/form/${formId}/filters`);
        return response;
    },

    /**
     * Get response count
     */
    getResponseCount: async (formId) => {
        const response = await axios.get(`/responses/form/${formId}/count`);
        return response;
    },

    /**
     * Delete a single response by ID
     */
    deleteResponse: async (responseId) => {
        const response = await axios.delete(`/responses/${responseId}`);
        return response;
    },

    /**
     * Delete all responses for a form
     */
    deleteAllResponses: async (formId) => {
        const response = await axios.delete(`/responses/form/${formId}`);
        return response;
    }
};

export default responseService;
