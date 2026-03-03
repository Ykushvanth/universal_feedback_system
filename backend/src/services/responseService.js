/**
 * Response Service
 * Business logic for response management
 */

const ResponseModel = require('../models/Response');
const FormModel = require('../models/Form');
const AIService = require('./aiService');
const { supabase } = require('../config/database');
const { logger } = require('../utils/logger');
const { calculateResponseScore, isAllowedDomain, isFormActive } = require('../utils/helpers');

class ResponseService {
    /**
     * Submit new response
     */
    static async submitResponse(responseData) {
        try {
            // Check if form exists and is active
            const form = await FormModel.findById(responseData.form_id);

            if (!form) {
                throw new Error('Form not found');
            }

            if (!isFormActive(form)) {
                throw new Error('Form is not accepting responses');
            }

            // Validate email domain if required
            const email = responseData.general_details?.email;
            if (email) {
                if (form.settings?.restrict_domain) {
                    const allowedDomain = form.settings.allowed_domain || 'klu.ac.in';
                    // isAllowedDomain expects an array; wrap string if needed
                    const domainList = Array.isArray(allowedDomain)
                        ? allowedDomain
                        : [allowedDomain];
                    if (!isAllowedDomain(email, domainList)) {
                        throw new Error(`Only ${allowedDomain} email addresses are allowed`);
                    }
                }

                // Check for duplicate submission
                if (form.settings?.prevent_duplicate) {
                    const isDuplicate = await ResponseModel.checkDuplicateEmail(responseData.form_id, email);
                    if (isDuplicate) {
                        throw new Error('You have already submitted a response for this form');
                    }
                }
            }

            // Calculate scores
            const scores = calculateResponseScore(responseData.answers, form.sections);
            responseData.scores = scores;

            // Create response
            const response = await ResponseModel.create(responseData);

            // Sync total_responses on forms table (non-blocking)
            try {
                const newCount = await ResponseModel.getCount(responseData.form_id);
                await supabase
                    .from('forms')
                    .update({ total_responses: newCount })
                    .eq('form_id', responseData.form_id);
            } catch (_e) { /* non-blocking */ }

            logger.info(`Response submitted: ${response.response_id} for form ${responseData.form_id}`);

            // ── Background AI sentiment analysis ──────────────────────────────
            // Fires AFTER the response is saved and returned to the student.
            // Any failure here is completely swallowed — submission is never affected.
            setImmediate(() => {
                ResponseService._analyzeCommentsInBackground(
                    response.response_id,
                    responseData.answers
                );
            });

            return response;
        } catch (error) {
            logger.error('Submit response service error:', error);
            throw error;
        }
    }

    /**
     * Background task: extract text/textarea answers, send to HF API,
     * and store sentiment back on each answer in the DB.
     *
     * This method NEVER throws. All errors are logged and ignored.
     */
    static async _analyzeCommentsInBackground(responseId, answers) {
        try {
            if (!Array.isArray(answers) || answers.length === 0) return;

            // Only process open-text questions
            const textAnswers = answers.filter(
                a => (a.type === 'text' || a.type === 'textarea') &&
                     a.value && String(a.value).trim().length > 0
            );

            if (textAnswers.length === 0) return;

            logger.info(`AI background: analysing ${textAnswers.length} comment(s) for response ${responseId}`);

            const texts = textAnswers.map(a => String(a.value).trim());

            // analyzeSentiment never throws — returns neutral defaults on failure
            const sentiments = await AIService.analyzeSentiment(texts);

            // Enrich the original answers array with sentiment data
            const enrichedAnswers = answers.map(answer => {
                const idx = textAnswers.indexOf(answer);
                if (idx === -1) return answer; // not a text question
                const result = sentiments[idx];
                return {
                    ...answer,
                    sentiment:            result?.sentiment           || 'neutral',
                    sentiment_confidence: result?.confidence          ?? 0,
                    sentiment_score:      result?.vader_score         ?? 0,
                    pattern_matched:      result?.pattern_matched     ?? false,
                    pattern_type:         result?.pattern_type        ?? null,
                    ai_analyzed:          result?.ai_analyzed         ?? false
                };
            });

            // Persist enriched answers back to DB
            const { error } = await supabase
                .from('responses')
                .update({ answers: enrichedAnswers })
                .eq('response_id', responseId);

            if (error) {
                logger.error(`AI background: failed to save sentiment for ${responseId}:`, error);
            } else {
                logger.info(`AI background: sentiment stored for response ${responseId}`);
            }
        } catch (err) {
            // Completely swallow — this must never affect the submission
            logger.error(`AI background: unexpected error for ${responseId}:`, err);
        }
    }

    /**
     * Get all responses for a form
     */
    static async getResponses(formId, filters = {}, userId) {
        try {
            // Check if form exists and user owns it
            const form = await FormModel.findById(formId);

            if (!form) {
                throw new Error('Form not found');
            }

            if (form.created_by !== userId) {
                throw new Error('Unauthorized to view responses');
            }

            // Get responses with filters
            const responses = await ResponseModel.getByFormId(formId, filters);

            return responses;
        } catch (error) {
            logger.error('Get responses service error:', error);
            throw error;
        }
    }

    /**
     * Get response by ID
     */
    static async getResponseById(responseId, userId) {
        try {
            const response = await ResponseModel.findById(responseId);

            if (!response) {
                throw new Error('Response not found');
            }

            // Check if user owns the form
            const form = await FormModel.findById(response.form_id);

            if (!form || form.created_by !== userId) {
                throw new Error('Unauthorized to view this response');
            }

            return response;
        } catch (error) {
            logger.error('Get response by ID service error:', error);
            throw error;
        }
    }

    /**
     * Get filter options for cascading filters
     */
    static async getFilterOptions(formId, userId) {
        try {
            // Check if form exists and user owns it
            const form = await FormModel.findById(formId);

            if (!form) {
                throw new Error('Form not found');
            }

            if (form.created_by !== userId) {
                throw new Error('Unauthorized to view filter options');
            }

            // Get unique values for each filter field
            const degrees = await ResponseModel.getFilterOptions(formId, 'degree');
            const departments = await ResponseModel.getFilterOptions(formId, 'department');
            const sections = await ResponseModel.getFilterOptions(formId, 'section');
            const years = await ResponseModel.getFilterOptions(formId, 'year');

            return {
                degrees,
                departments,
                sections,
                years
            };
        } catch (error) {
            logger.error('Get filter options service error:', error);
            throw error;
        }
    }

    /**
     * Get response count
     */
    static async getResponseCount(formId, userId) {
        try {
            // Check if form exists and user owns it
            const form = await FormModel.findById(formId);

            if (!form) {
                throw new Error('Form not found');
            }

            if (form.created_by !== userId) {
                throw new Error('Unauthorized to view response count');
            }

            const count = await ResponseModel.getCount(formId);

            return count;
        } catch (error) {
            logger.error('Get response count service error:', error);
            throw error;
        }
    }

    /**
     * Delete a single response
     */
    static async deleteResponse(responseId, userId) {
        try {
            const response = await ResponseModel.findById(responseId);

            if (!response) {
                throw new Error('Response not found');
            }

            // Check if user owns the parent form
            const form = await FormModel.findById(response.form_id);
            if (!form || form.created_by !== userId) {
                throw new Error('Unauthorized to delete this response');
            }

            await ResponseModel.deleteById(responseId);

            // Decrement total_responses on forms table
            try {
                const newCount = await ResponseModel.getCount(response.form_id);
                await supabase
                    .from('forms')
                    .update({ total_responses: newCount })
                    .eq('form_id', response.form_id);
            } catch (_e) { /* non-blocking */ }

            logger.info(`Response deleted: ${responseId} by user ${userId}`);
            return true;
        } catch (error) {
            logger.error('Delete response service error:', error);
            throw error;
        }
    }

    /**
     * Delete all responses for a form
     */
    static async deleteAllResponses(formId, userId) {
        try {
            // Check if form exists and user owns it
            const form = await FormModel.findById(formId);

            if (!form) {
                throw new Error('Form not found');
            }

            if (form.created_by !== userId) {
                throw new Error('Unauthorized to delete responses');
            }

            await ResponseModel.deleteByFormId(formId);

            // Reset total_responses on forms table
            try {
                await supabase
                    .from('forms')
                    .update({ total_responses: 0 })
                    .eq('form_id', formId);
            } catch (_e) { /* non-blocking */ }

            logger.info(`All responses deleted for form: ${formId} by user ${userId}`);

            return true;
        } catch (error) {
            logger.error('Delete all responses service error:', error);
            throw error;
        }
    }
}

module.exports = ResponseService;
