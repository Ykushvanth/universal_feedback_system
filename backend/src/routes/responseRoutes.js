/**
 * Response Routes
 * Define all response-related endpoints
 */

const express = require('express');
const router = express.Router();
const ResponseController = require('../controllers/responseController');
const { authenticate } = require('../middleware/authMiddleware');
const { validateRequest } = require('../utils/validators');
const { responseSchemas } = require('../utils/validators');

/**
 * @route   POST /api/responses/submit
 * @desc    Submit new response (student)
 * @access  Public
 */
router.post(
    '/submit',
    validateRequest(responseSchemas.submit),
    ResponseController.submitResponse
);

/**
 * @route   GET /api/responses/form/:formId
 * @desc    Get all responses for a form with optional filters
 * @access  Private (Admin - Owner only)
 */
router.get(
    '/form/:formId',
    authenticate,
    ResponseController.getResponses
);

/**
 * @route   GET /api/responses/form/:formId/filters
 * @desc    Get filter options for cascading filters
 * @access  Private (Admin - Owner only)
 */
router.get(
    '/form/:formId/filters',
    authenticate,
    ResponseController.getFilterOptions
);

/**
 * @route   GET /api/responses/form/:formId/count
 * @desc    Get response count for a form
 * @access  Private (Admin - Owner only)
 */
router.get(
    '/form/:formId/count',
    authenticate,
    ResponseController.getResponseCount
);

/**
 * @route   GET /api/responses/:responseId
 * @desc    Get single response by ID
 * @access  Private (Admin - Owner only)
 */
router.get(
    '/:responseId',
    authenticate,
    ResponseController.getResponseById
);

/**
 * @route   DELETE /api/responses/:responseId
 * @desc    Delete a single response by ID
 * @access  Private (Admin - Owner only)
 */
router.delete(
    '/:responseId',
    authenticate,
    ResponseController.deleteResponse
);

/**
 * @route   DELETE /api/responses/form/:formId
 * @desc    Delete all responses for a form
 * @access  Private (Admin - Owner only)
 */
router.delete(
    '/form/:formId',
    authenticate,
    ResponseController.deleteAllResponses
);

module.exports = router;
