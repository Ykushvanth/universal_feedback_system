/**
 * Analysis Controller
 * Handle analysis-related HTTP requests
 */

const AnalysisService = require('../services/analysisService');
const { successResponse } = require('../utils/responseFormatter');
const { logger } = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

class AnalysisController {
    /**
     * Get comprehensive form analysis
     * GET /api/analysis/:formId
     */
    static async getFormAnalysis(req, res, next) {
        try {
            const { formId } = req.params;
            const userId = req.user.id;

            // Accept any query param as a filter (dynamically, based on form's general_detail_fields)
            const excludedParams = ['cache'];
            const filters = {};
            Object.keys(req.query).forEach(key => {
                if (!excludedParams.includes(key) && req.query[key]) {
                    filters[key] = req.query[key];
                }
            });

            // Check if cached analysis should be used
            const useCache = req.query.cache === 'true';

            let analysis;

            if (useCache) {
                // Try to get cached analysis
                analysis = await AnalysisService.getCachedAnalysis(formId, filters, userId);
                
                if (analysis) {
                    return successResponse(
                        res,
                        { 
                            analysis,
                            cached: true 
                        },
                        'Analysis retrieved from cache'
                    );
                }
            }

            // Generate fresh analysis
            analysis = await AnalysisService.getFormAnalysis(formId, filters, userId);

            return successResponse(
                res,
                { 
                    analysis,
                    cached: false 
                },
                'Analysis generated successfully'
            );
        } catch (error) {
            logger.error('Get form analysis controller error:', error);

            if (error.message === 'Form not found') {
                return next(new AppError(error.message, 404));
            }

            if (error.message.includes('Unauthorized')) {
                return next(new AppError(error.message, 403));
            }

            return next(new AppError('Failed to generate analysis', 500));
        }
    }

    /**
     * Get sentiment analysis only
     * GET /api/analysis/:formId/sentiment
     */
    static async getSentimentAnalysis(req, res, next) {
        try {
            const { formId } = req.params;
            const userId = req.user.id;

            const excludedParams = ['cache'];
            const filters = {};
            Object.keys(req.query).forEach(key => {
                if (!excludedParams.includes(key) && req.query[key]) {
                    filters[key] = req.query[key];
                }
            });

            const analysis = await AnalysisService.getFormAnalysis(formId, filters, userId);

            return successResponse(
                res,
                { 
                    sentiment_analysis: analysis.sentiment_details,
                    filters: filters
                },
                'Sentiment analysis retrieved successfully'
            );
        } catch (error) {
            logger.error('Get sentiment analysis controller error:', error);

            if (error.message === 'Form not found') {
                return next(new AppError(error.message, 404));
            }

            if (error.message.includes('Unauthorized')) {
                return next(new AppError(error.message, 403));
            }

            return next(new AppError('Failed to retrieve sentiment analysis', 500));
        }
    }

    /**
     * Get question analysis only
     * GET /api/analysis/:formId/questions
     */
    static async getQuestionAnalysis(req, res, next) {
        try {
            const { formId } = req.params;
            const userId = req.user.id;

            const filters = {};
            if (req.query.degree) filters.degree = req.query.degree;
            if (req.query.department) filters.department = req.query.department;
            if (req.query.section) filters.section = req.query.section;
            if (req.query.year) filters.year = req.query.year;

            const analysis = await AnalysisService.getFormAnalysis(formId, filters, userId);

            return successResponse(
                res,
                { 
                    question_analysis: analysis.question_analysis,
                    filters: filters
                },
                'Question analysis retrieved successfully'
            );
        } catch (error) {
            logger.error('Get question analysis controller error:', error);

            if (error.message === 'Form not found') {
                return next(new AppError(error.message, 404));
            }

            if (error.message.includes('Unauthorized')) {
                return next(new AppError(error.message, 403));
            }

            return next(new AppError('Failed to retrieve question analysis', 500));
        }
    }

    /**
     * Get tabular (department/faculty-wise) report data
     * GET /api/analysis/:formId/tabular
     */
    static async getTabularReport(req, res, next) {
        try {
            const { formId } = req.params;
            const userId = req.user.id;

            const excludedParams = ['cache'];
            const filters = {};
            Object.keys(req.query).forEach(key => {
                if (!excludedParams.includes(key) && req.query[key]) {
                    filters[key] = req.query[key];
                }
            });

            const report = await AnalysisService.getTabularReport(formId, filters, userId);

            return successResponse(
                res,
                { report },
                'Tabular report generated successfully'
            );
        } catch (error) {
            logger.error('Get tabular report controller error:', error);
            if (error.message === 'Form not found') return next(new AppError(error.message, 404));
            if (error.message.includes('Unauthorized')) return next(new AppError(error.message, 403));
            return next(new AppError('Failed to generate tabular report', 500));
        }
    }

    /**
     * Get score statistics only
     * GET /api/analysis/:formId/scores
     */
    static async getScoreStatistics(req, res, next) {
        try {
            const { formId } = req.params;
            const userId = req.user.id;

            const filters = {};
            if (req.query.degree) filters.degree = req.query.degree;
            if (req.query.department) filters.department = req.query.department;
            if (req.query.section) filters.section = req.query.section;
            if (req.query.year) filters.year = req.query.year;

            const analysis = await AnalysisService.getFormAnalysis(formId, filters, userId);

            return successResponse(
                res,
                { 
                    score_statistics: analysis.score_statistics,
                    filters: filters
                },
                'Score statistics retrieved successfully'
            );
        } catch (error) {
            logger.error('Get score statistics controller error:', error);

            if (error.message === 'Form not found') {
                return next(new AppError(error.message, 404));
            }

            if (error.message.includes('Unauthorized')) {
                return next(new AppError(error.message, 403));
            }

            return next(new AppError('Failed to retrieve score statistics', 500));
        }
    }
}

module.exports = AnalysisController;
