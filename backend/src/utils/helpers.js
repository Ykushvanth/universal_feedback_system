/**
 * Helper Functions and Utilities
 */

const crypto = require('crypto');

/**
 * Generate unique ID
 */
function generateUniqueId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const randomStr = crypto.randomBytes(6).toString('hex');
    return `${prefix}${prefix ? '_' : ''}${timestamp}_${randomStr}`;
}

/**
 * Generate form ID
 */
function generateFormId() {
    return generateUniqueId('form');
}

/**
 * Generate response ID
 */
function generateResponseId() {
    return generateUniqueId('response');
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Check if email domain is allowed
 */
function isAllowedDomain(email, allowedDomains) {
    if (!allowedDomains || allowedDomains.length === 0) {
        return true;
    }

    const domain = email.split('@')[1];
    return allowedDomains.some(allowed => 
        domain === allowed.replace('@', '')
    );
}

/**
 * Sanitize string input
 */
function sanitizeString(str) {
    if (!str) return '';
    return str.toString().trim().replace(/[<>]/g, '');
}

/**
 * Calculate pagination
 */
function getPagination(page = 1, limit = 10) {
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    return {
        page: pageNum,
        limit: limitNum,
        offset: offset
    };
}

/**
 * Format pagination response
 */
function formatPaginationResponse(data, total, page, limit) {
    const totalPages = Math.ceil(total / limit);

    return {
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages,
            hasMore: page < totalPages
        }
    };
}

/**
 * Calculate form scores
 */
function calculateFormScore(sections) {
    let totalPossibleScore = 0;

    if (!Array.isArray(sections)) {
        return totalPossibleScore;
    }

    sections.forEach(section => {
        section.questions?.forEach(question => {
            // Check if question has option_scores (for radio/checkbox questions)
            if (question.option_scores && typeof question.option_scores === 'object') {
                const scores = Object.values(question.option_scores);
                if (scores.length > 0) {
                    const maxScore = Math.max(...scores.map(s => parseFloat(s) || 0));
                    totalPossibleScore += maxScore;
                }
            } else if (question.max_score) {
                // For text/textarea questions with max_score
                totalPossibleScore += parseFloat(question.max_score) || 0;
            }
        });
    });

    return totalPossibleScore;
}

/**
 * Calculate response score
 */
function calculateResponseScore(answers, formSections) {
    let totalScore = 0;
    const sectionScores = {};

    if (!Array.isArray(formSections)) {
        return { totalScore, sectionScores };
    }

    // Normalise answers: supports both array [{question_id, value}] and object {id: value}
    const getAnswerValue = (questionId) => {
        if (Array.isArray(answers)) {
            const found = answers.find(a => a.question_id === questionId);
            return found ? found.value : undefined;
        }
        return answers[questionId];
    };

    formSections.forEach(section => {
        let sectionScore = 0;

        section.questions?.forEach(question => {
            const answer = getAnswerValue(question.id);

            if (answer === undefined || answer === null || answer === '') return;

            if (question.type === 'checkbox') {
                // Multiple choice - sum all selected
                if (Array.isArray(answer)) {
                    answer.forEach(selectedOption => {
                        const score = question.option_scores?.[selectedOption] || 0;
                        sectionScore += parseFloat(score) || 0;
                    });
                }
            } else if (question.type === 'radio' || question.type === 'dropdown') {
                // Single choice - get score from option_scores
                const score = question.option_scores?.[answer] || 0;
                sectionScore += parseFloat(score) || 0;
            } else if (question.type === 'rating' || question.type === 'scale') {
                // Direct score
                sectionScore += parseInt(answer) || 0;
            }
        });

        sectionScores[section.id] = sectionScore;
        totalScore += sectionScore;
    });

    return { totalScore, sectionScores };
}

/**
 * Hash filter criteria for caching
 */
function hashFilterCriteria(criteria) {
    const str = JSON.stringify(criteria);
    return crypto.createHash('md5').update(str).digest('hex');
}

/**
 * Format date to ISO string
 */
function formatDate(date) {
    return date ? new Date(date).toISOString() : null;
}

/**
 * Check if form is active
 */
function isFormActive(form) {
    if (!form.is_active) return false;
    
    if (form.deadline) {
        const deadline = new Date(form.deadline);
        if (deadline < new Date()) return false;
    }

    return true;
}

/**
 * Mask sensitive data
 */
function maskEmail(email) {
    const [local, domain] = email.split('@');
    const maskedLocal = local.slice(0, 2) + '***' + local.slice(-1);
    return `${maskedLocal}@${domain}`;
}

/**
 * Delay function for rate limiting
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    generateUniqueId,
    generateFormId,
    generateResponseId,
    isValidEmail,
    isAllowedDomain,
    sanitizeString,
    getPagination,
    formatPaginationResponse,
    calculateFormScore,
    calculateResponseScore,
    hashFilterCriteria,
    formatDate,
    isFormActive,
    maskEmail,
    delay
};
