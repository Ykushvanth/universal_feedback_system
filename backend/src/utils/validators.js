/**
 * Validation Utility Functions
 */

const Joi = require('joi');
const { VALIDATION } = require('../config/constants');

/**
 * User validation schemas
 */
const userSchemas = {
    register: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string()
            .min(VALIDATION.MIN_PASSWORD_LENGTH)
            .max(VALIDATION.MAX_PASSWORD_LENGTH)
            .required(),
        name: Joi.string()
            .min(VALIDATION.MIN_NAME_LENGTH)
            .max(VALIDATION.MAX_NAME_LENGTH)
            .required()
    }),

    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    }),

    updateProfile: Joi.object({
        name: Joi.string()
            .min(VALIDATION.MIN_NAME_LENGTH)
            .max(VALIDATION.MAX_NAME_LENGTH),
        password: Joi.string()
            .min(VALIDATION.MIN_PASSWORD_LENGTH)
            .max(VALIDATION.MAX_PASSWORD_LENGTH)
    })
};

/**
 * Form validation schemas
 */
const formSchemas = {
    create: Joi.object({
        title: Joi.string().max(VALIDATION.MAX_TITLE_LENGTH).required(),
        description: Joi.string().max(VALIDATION.MAX_DESCRIPTION_LENGTH).allow(''),
        sections: Joi.array().items(Joi.object()).required(),
        settings: Joi.object(),
        allowed_domains: Joi.array().items(Joi.string()),
        one_response_per_email: Joi.boolean(),
        deadline: Joi.date().iso().allow(null),
        is_anonymous: Joi.boolean()
    }),

    update: Joi.object({
        title: Joi.string().max(VALIDATION.MAX_TITLE_LENGTH),
        description: Joi.string().max(VALIDATION.MAX_DESCRIPTION_LENGTH).allow(''),
        sections: Joi.array().items(Joi.object()),
        settings: Joi.object(),
        allowed_domains: Joi.array().items(Joi.string()),
        one_response_per_email: Joi.boolean(),
        deadline: Joi.date().iso().allow(null),
        is_active: Joi.boolean(),
        is_anonymous: Joi.boolean()
    })
};

/**
 * Response validation schemas
 */
const responseSchemas = {
    submit: Joi.object({
        form_id: Joi.string().required(),
        general_details: Joi.object().required(),
        answers: Joi.alternatives().try(Joi.array(), Joi.object()).required()
    })
};

/**
 * Validate data against schema
 */
function validate(data, schema) {
    const { error, value } = schema.validate(data, { abortEarly: false, allowUnknown: true, stripUnknown: true });

    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
        }));

        return { valid: false, errors, value: null };
    }

    return { valid: true, errors: null, value };
}

/**
 * Validation middleware factory
 */
function validateRequest(schema, property = 'body') {
    return (req, res, next) => {
        const { valid, errors } = validate(req[property], schema);

        if (!valid) {
            return res.status(422).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        next();
    };
}

module.exports = {
    userSchemas,
    formSchemas,
    responseSchemas,
    validate,
    validateRequest
};
