/**
 * Response API Service
 * Handles all response-related API calls
 */

import axios from '../config/axios';
import supabase from '../config/supabase';
import { generateResponseId, calculateResponseScore, isAllowedDomain } from '../utils/helpers';

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
    },

    /**
     * Submit response directly to Supabase (bypasses Render backend).
     * Handles duplicate-email check, score calculation, and INSERT — all client-side.
     */
    submitResponseDirect: async (responseData, form) => {
        const { form_id, general_details, answers } = responseData;
        const email = general_details?.email;

        // --- Domain restriction check ---
        if (email && form.settings?.restrict_domain) {
            const allowedDomain = form.settings.allowed_domain || 'klu.ac.in';
            const domainList = Array.isArray(allowedDomain) ? allowedDomain : [allowedDomain];
            if (!isAllowedDomain(email, domainList)) {
                throw new Error(`Only ${allowedDomain} email addresses are allowed`);
            }
        }

        // --- Duplicate submission check ---
        if (email && form.settings?.prevent_duplicate) {
            const { data: existing } = await supabase
                .from('response_emails')
                .select('email')
                .eq('form_id', form_id)
                .eq('email', email.toLowerCase())
                .maybeSingle();

            if (existing) {
                throw new Error('You have already submitted a response for this form');
            }
        }

        // --- Calculate scores client-side ---
        const { totalScore, sectionScores } = calculateResponseScore(answers, form.sections);

        // --- Generate response ID client-side ---
        const responseId = generateResponseId();

        // --- Insert response ---
        const { data: inserted, error: insertError } = await supabase
            .from('responses')
            .insert([{
                response_id:   responseId,
                form_id:       form_id,
                general_details: general_details,
                answers:       answers,
                total_score:   totalScore,
                section_scores: sectionScores
            }])
            .select()
            .single();

        if (insertError) {
            throw new Error(insertError.message || 'Failed to submit response');
        }

        // --- Store email for duplicate checking (non-blocking) ---
        if (email) {
            supabase.from('response_emails').insert([{ form_id, email: email.toLowerCase() }]).then(() => {});
        }

        // --- Update total_responses count on form (non-blocking) ---
        supabase
            .from('responses')
            .select('response_id', { count: 'exact', head: true })
            .eq('form_id', form_id)
            .then(({ count }) => {
                if (count !== null) {
                    supabase.from('forms').update({ total_responses: count }).eq('form_id', form_id).then(() => {});
                }
            });

        return { success: true, data: { response: inserted } };
    }
};

export default responseService;
