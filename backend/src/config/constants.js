/**
 * Application Constants
 */

module.exports = {
    // User Roles
    USER_ROLES: {
        ADMIN: 'admin',
        SUPER_ADMIN: 'super_admin'
    },

    // Form Status
    FORM_STATUS: {
        DRAFT: 'draft',
        ACTIVE: 'active',
        CLOSED: 'closed'
    },

    // Field Types for Form Builder
    FIELD_TYPES: {
        TEXT: 'text',
        EMAIL: 'email',
        NUMBER: 'number',
        DATE: 'date',
        DROPDOWN: 'dropdown',
        RADIO: 'radio',
        CHECKBOX: 'checkbox',
        TEXTAREA: 'textarea'
    },

    // Question Types
    QUESTION_TYPES: {
        SINGLE_CHOICE: 'radio',
        MULTIPLE_CHOICE: 'checkbox',
        TEXT: 'text',
        RATING: 'rating',
        SCALE: 'scale'
    },

    // Section Types
    SECTION_TYPES: {
        SCORING: 'scoring',
        NON_SCORING: 'non_scoring'
    },

    // Sentiment Types
    SENTIMENT_TYPES: {
        POSITIVE: 'Positive',
        NEGATIVE: 'Negative',
        NEUTRAL: 'Neutral'
    },

    // Response Status
    RESPONSE_STATUS: {
        SUBMITTED: 'submitted',
        DRAFT: 'draft'
    },

    // Analysis Status
    ANALYSIS_STATUS: {
        PENDING: 'pending',
        PROCESSING: 'processing',
        COMPLETED: 'completed',
        FAILED: 'failed'
    },

    // HTTP Status Codes
    HTTP_STATUS: {
        OK: 200,
        CREATED: 201,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        UNPROCESSABLE_ENTITY: 422,
        INTERNAL_SERVER_ERROR: 500
    },

    // Pagination
    PAGINATION: {
        DEFAULT_PAGE: 1,
        DEFAULT_LIMIT: 10,
        MAX_LIMIT: 100
    },

    // Validation
    VALIDATION: {
        MIN_PASSWORD_LENGTH: 8,
        MAX_PASSWORD_LENGTH: 100,
        MIN_NAME_LENGTH: 2,
        MAX_NAME_LENGTH: 200,
        MAX_TITLE_LENGTH: 500,
        MAX_DESCRIPTION_LENGTH: 5000,
        MAX_COMMENT_LENGTH: 5000,
        MAX_OPTIONS_PER_QUESTION: 20,
        MAX_QUESTIONS_PER_SECTION: 100
    },

    // Cache
    CACHE_TTL: {
        SHORT: 60 * 5, // 5 minutes
        MEDIUM: 60 * 30, // 30 minutes
        LONG: 60 * 60 * 24 // 24 hours
    }
};
