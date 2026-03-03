/**
 * Response Formatter Utility
 */

const { HTTP_STATUS } = require('../config/constants');

/**
 * Success response
 */
function successResponse(res, data, message = 'Success', statusCode = HTTP_STATUS.OK) {
    return res.status(statusCode).json({
        success: true,
        message,
        data
    });
}

/**
 * Error response
 */
function errorResponse(res, message = 'Error occurred', statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errors = null) {
    const response = {
        success: false,
        message
    };

    if (errors) {
        response.errors = errors;
    }

    return res.status(statusCode).json(response);
}

/**
 * Validation error response
 */
function validationErrorResponse(res, errors) {
    return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: 'Validation failed',
        errors
    });
}

/**
 * Not found response
 */
function notFoundResponse(res, message = 'Resource not found') {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message
    });
}

/**
 * Unauthorized response
 */
function unauthorizedResponse(res, message = 'Unauthorized access') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message
    });
}

/**
 * Forbidden response
 */
function forbiddenResponse(res, message = 'Access forbidden') {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message
    });
}

/**
 * Created response
 */
function createdResponse(res, data, message = 'Created successfully') {
    return res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message,
        data
    });
}

module.exports = {
    successResponse,
    errorResponse,
    validationErrorResponse,
    notFoundResponse,
    unauthorizedResponse,
    forbiddenResponse,
    createdResponse
};
