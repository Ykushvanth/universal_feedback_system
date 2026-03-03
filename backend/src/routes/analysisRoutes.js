/**
 * Analysis Routes
 * Define all analysis-related endpoints
 */

const express = require('express');
const router = express.Router();
const AnalysisController = require('../controllers/analysisController');
const { authenticate } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/analysis/:formId
 * @desc    Get comprehensive form analysis with AI insights
 * @access  Private (Admin - Owner only)
 * @query   degree, department, section, year (optional filters)
 * @query   cache (optional, use cached analysis if available)
 */
router.get(
    '/:formId',
    authenticate,
    AnalysisController.getFormAnalysis
);

/**
 * @route   GET /api/analysis/:formId/sentiment
 * @desc    Get sentiment analysis only
 * @access  Private (Admin - Owner only)
 * @query   degree, department, section, year (optional filters)
 */
router.get(
    '/:formId/sentiment',
    authenticate,
    AnalysisController.getSentimentAnalysis
);

/**
 * @route   GET /api/analysis/:formId/questions
 * @desc    Get question-wise analysis
 * @access  Private (Admin - Owner only)
 * @query   degree, department, section, year (optional filters)
 */
router.get(
    '/:formId/questions',
    authenticate,
    AnalysisController.getQuestionAnalysis
);

/**
 * @route   GET /api/analysis/:formId/tabular
 * @desc    Get department/faculty-wise tabular report data
 * @access  Private (Admin - Owner only)
 */
router.get(
    '/:formId/tabular',
    authenticate,
    AnalysisController.getTabularReport
);

/**
 * @route   GET /api/analysis/:formId/scores
 * @desc    Get score statistics
 * @access  Private (Admin - Owner only)
 * @query   degree, department, section, year (optional filters)
 */
router.get(
    '/:formId/scores',
    authenticate,
    AnalysisController.getScoreStatistics
);

module.exports = router;
