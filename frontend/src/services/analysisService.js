/**
 * Analysis API Service
 * Handles all analysis-related API calls
 */

import axios from '../config/axios';

const analysisService = {
    /**
     * Get comprehensive form analysis
     */
    getFormAnalysis: async (formId, filters = {}, useCache = false) => {
        const params = new URLSearchParams({
            ...filters,
            cache: useCache.toString()
        }).toString();

        // Analysis can take several minutes when comments are sent to the HF Space
        // in sequential batches (single-worker API). Use a 5-minute timeout here
        // instead of the global 30 s default so the frontend doesn't abort early.
        const response = await axios.get(
            `/analysis/${formId}${params ? '?' + params : ''}`,
            { timeout: 300000 }
        );
        return response;
    },

    /**
     * Get sentiment analysis only
     */
    getSentimentAnalysis: async (formId, filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await axios.get(`/analysis/${formId}/sentiment${params ? '?' + params : ''}`);
        return response;
    },

    /**
     * Get question analysis only
     */
    getQuestionAnalysis: async (formId, filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await axios.get(`/analysis/${formId}/questions${params ? '?' + params : ''}`);
        return response;
    },

    /**
     * Get tabular (department/faculty-wise) report data
     */
    getTabularReport: async (formId, filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await axios.get(`/analysis/${formId}/tabular${params ? '?' + params : ''}`);
        return response;
    },

    /**
     * Get score statistics only
     */
    getScoreStatistics: async (formId, filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await axios.get(`/analysis/${formId}/scores${params ? '?' + params : ''}`);
        return response;
    }
};

export default analysisService;
