/**
 * Response Model
 * Handles all response-related database operations
 */

const { supabase } = require('../config/database');
const { logger } = require('../utils/logger');
const { generateResponseId } = require('../utils/helpers');

class ResponseModel {
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
     * Normalise a response row — parse any JSON string fields.
     */
    static _parseResponse(row) {
        if (!row) return row;
        return {
            ...row,
            general_details: this._parseJsonField(row.general_details, {}),
            answers:         this._parseJsonField(row.answers, [])
        };
    }

    /**
     * Create new response
     */
    static async create(responseData) {
        try {
            const responseId = generateResponseId();

            const { data, error } = await supabase
                .from('responses')
                .insert([{
                    response_id: responseId,
                    form_id: responseData.form_id,
                    general_details: responseData.general_details,
                    answers: responseData.answers
                }])
                .select()
                .single();

            if (error) {
                throw error;
            }

            // Store email separately for duplicate checking
            if (responseData.general_details?.email) {
                await this.storeEmail(responseData.form_id, responseData.general_details.email);
            }

            return this._parseResponse(data);
        } catch (error) {
            logger.error('Error creating response:', error);
            throw error;
        }
    }

    /**
     * Store email for duplicate checking
     */
    static async storeEmail(formId, email) {
        try {
            const { error } = await supabase
                .from('response_emails')
                .insert([{
                    form_id: formId,
                    email: email.toLowerCase()
                }]);

            if (error && error.code !== '23505') { // Ignore duplicate key errors
                throw error;
            }

            return true;
        } catch (error) {
            logger.error('Error storing email:', error);
            return false;
        }
    }

    /**
     * Check if email already submitted
     */
    static async checkDuplicateEmail(formId, email) {
        try {
            const { data, error } = await supabase
                .from('response_emails')
                .select('email')
                .eq('form_id', formId)
                .eq('email', email.toLowerCase())
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return !!data; // Returns true if email exists
        } catch (error) {
            logger.error('Error checking duplicate email:', error);
            return false;
        }
    }

    /**
     * Get response by ID
     */
    static async findById(responseId) {
        try {
            const { data, error } = await supabase
                .from('responses')
                .select('*')
                .eq('response_id', responseId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return this._parseResponse(data);
        } catch (error) {
            logger.error('Error finding response by ID:', error);
            throw error;
        }
    }

    /**
     * Get all responses for a form (paginates automatically to bypass Supabase's 1000-row cap)
     */
    static async getByFormId(formId, filters = {}) {
        try {
            // Build the shared filter object once
            const exactFilters = {};
            Object.entries(filters).forEach(([key, value]) => {
                if (value && String(value).trim()) {
                    exactFilters[key] = String(value).trim();
                }
            });
            const hasFilters = Object.keys(exactFilters).length > 0;

            const PAGE_SIZE = 1000;
            let allRows = [];
            let from = 0;

            // Keep fetching pages until a page returns fewer rows than PAGE_SIZE
            while (true) {
                let query = supabase
                    .from('responses')
                    .select('*')
                    .eq('form_id', formId)
                    .order('submitted_at', { ascending: false })
                    .range(from, from + PAGE_SIZE - 1);

                if (hasFilters) {
                    query = query.contains('general_details', exactFilters);
                }

                const { data, error } = await query;

                if (error) throw error;

                const rows = data || [];
                allRows = allRows.concat(rows);

                if (rows.length < PAGE_SIZE) break; // last page reached
                from += PAGE_SIZE;
            }

            return allRows.map(row => this._parseResponse(row));
        } catch (error) {
            logger.error('Error getting responses by form ID:', error);
            throw error;
        }
    }

    /**
     * Get unique filter values for cascading dropdowns
     */
    static async getFilterOptions(formId, field) {
        try {
            const { data, error } = await supabase
                .from('responses')
                .select('general_details')
                .eq('form_id', formId);

            if (error) {
                throw error;
            }

            // Extract unique values for the field
            const uniqueValues = new Set();
            data.forEach(response => {
                if (response.general_details && response.general_details[field]) {
                    uniqueValues.add(response.general_details[field]);
                }
            });

            return Array.from(uniqueValues).sort();
        } catch (error) {
            logger.error('Error getting filter options:', error);
            throw error;
        }
    }

    /**
     * Get response count for a form, with optional filters on general_details JSONB
     */
    static async getCount(formId, filters = {}) {
        try {
            let query = supabase
                .from('responses')
                .select('*', { count: 'exact', head: true })
                .eq('form_id', formId);

            // Apply the same JSONB filter logic used in getByFormId
            const exactFilters = {};
            Object.entries(filters).forEach(([key, value]) => {
                if (value && String(value).trim()) {
                    exactFilters[key] = String(value).trim();
                }
            });
            if (Object.keys(exactFilters).length > 0) {
                query = query.contains('general_details', exactFilters);
            }

            const { count, error } = await query;

            if (error) {
                throw error;
            }

            return count || 0;
        } catch (error) {
            logger.error('Error getting response count:', error);
            throw error;
        }
    }

    /**
     * Delete a single response by ID
     */
    static async deleteById(responseId) {
        try {
            const { error } = await supabase
                .from('responses')
                .delete()
                .eq('response_id', responseId);

            if (error) {
                throw error;
            }

            return true;
        } catch (error) {
            logger.error('Error deleting response by ID:', error);
            throw error;
        }
    }

    /**
     * Delete all responses for a form
     */
    static async deleteByFormId(formId) {
        try {
            const { error } = await supabase
                .from('responses')
                .delete()
                .eq('form_id', formId);

            if (error) {
                throw error;
            }

            // Also delete emails
            await supabase
                .from('response_emails')
                .delete()
                .eq('form_id', formId);

            return true;
        } catch (error) {
            logger.error('Error deleting responses:', error);
            throw error;
        }
    }
}

module.exports = ResponseModel;
