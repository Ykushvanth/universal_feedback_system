/**
 * Form Routes
 * Define all form-related endpoints
 */

const express = require('express');
const router = express.Router();
const FormController = require('../controllers/formController');
const { authenticate, optionalAuthenticate } = require('../middleware/authMiddleware');
const { validateRequest } = require('../utils/validators');
const { formSchemas } = require('../utils/validators');

/**
 * @route   POST /api/forms
 * @desc    Create new form
 * @access  Private (Admin)
 */
router.post(
    '/',
    authenticate,
    validateRequest(formSchemas.create),
    FormController.createForm
);

/**
 * @route   GET /api/forms
 * @desc    Get all forms for logged-in user
 * @access  Private (Admin)
 */
router.get(
    '/',
    authenticate,
    FormController.getAllForms
);

/**
 * @route   GET /api/forms/:formId
 * @desc    Get form by ID
 * @access  Public (student view) / Private (admin view)
 */
router.get(
    '/:formId',
    optionalAuthenticate,
    FormController.getForm
);

/**
 * @route   PUT /api/forms/:formId
 * @desc    Update form
 * @access  Private (Admin - Owner only)
 */
router.put(
    '/:formId',
    authenticate,
    validateRequest(formSchemas.update),
    FormController.updateForm
);

/**
 * @route   DELETE /api/forms/:formId
 * @desc    Delete form (soft delete)
 * @access  Private (Admin - Owner only)
 */
router.delete(
    '/:formId',
    authenticate,
    FormController.deleteForm
);

/**
 * @route   POST /api/forms/:formId/duplicate
 * @desc    Duplicate form
 * @access  Private (Admin - Owner only)
 */
router.post(
    '/:formId/duplicate',
    authenticate,
    FormController.duplicateForm
);

/**
 * @route   PATCH /api/forms/:formId/status
 * @desc    Change form status (draft/active/closed)
 * @access  Private (Admin - Owner only)
 */
router.patch(
    '/:formId/status',
    authenticate,
    FormController.changeFormStatus
);

/**
 * @route   GET /api/forms/:formId/statistics
 * @desc    Get form statistics
 * @access  Private (Admin - Owner only)
 */
router.get(
    '/:formId/statistics',
    authenticate,
    FormController.getFormStatistics
);

module.exports = router;
