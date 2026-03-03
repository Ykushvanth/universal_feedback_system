/**
 * Frontend Helpers
 * Score calculation and ID generation ported from backend/src/utils/helpers.js
 * Used by the direct Supabase student-form flow.
 */

/**
 * Generate a unique ID with optional prefix.
 * Mirrors backend generateUniqueId().
 */
export function generateUniqueId(prefix = '') {
    const timestamp  = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 10);
    return `${prefix}${prefix ? '_' : ''}${timestamp}_${randomPart}`;
}

export function generateResponseId() {
    return generateUniqueId('response');
}

/**
 * Check whether a form is currently active.
 * Mirrors backend isFormActive().
 */
export function isFormActive(form) {
    if (!form.is_active) return false;
    if (form.deadline && new Date(form.deadline) < new Date()) return false;
    return true;
}

/**
 * Check whether an email domain is in the allowed list.
 * Mirrors backend isAllowedDomain().
 */
export function isAllowedDomain(email, allowedDomains) {
    if (!allowedDomains || allowedDomains.length === 0) return true;
    const domain = email.split('@')[1];
    return allowedDomains.some(allowed => domain === allowed.replace('@', ''));
}

/**
 * Calculate total score and per-section scores for a submitted response.
 * Mirrors backend calculateResponseScore().
 *
 * @param {Array}  answers      - Array of { question_id, type, value }
 * @param {Array}  formSections - sections array from the form
 * @returns {{ totalScore: number, sectionScores: object }}
 */
export function calculateResponseScore(answers, formSections) {
    let totalScore = 0;
    const sectionScores = {};

    if (!Array.isArray(formSections)) return { totalScore, sectionScores };

    const getAnswerValue = (questionId) => {
        if (Array.isArray(answers)) {
            const found = answers.find(a => a.question_id === questionId);
            return found ? found.value : undefined;
        }
        return answers[questionId];
    };

    formSections.forEach(section => {
        let sectionScore = 0;

        (section.questions || []).forEach(question => {
            const answer = getAnswerValue(question.id);
            if (answer === undefined || answer === null || answer === '') return;

            if (question.type === 'checkbox') {
                if (Array.isArray(answer)) {
                    answer.forEach(selectedOption => {
                        sectionScore += parseFloat(question.option_scores?.[selectedOption] || 0);
                    });
                }
            } else if (question.type === 'radio' || question.type === 'dropdown') {
                sectionScore += parseFloat(question.option_scores?.[answer] || 0);
            } else if (question.type === 'rating' || question.type === 'scale') {
                sectionScore += parseInt(answer) || 0;
            }
        });

        sectionScores[section.id] = sectionScore;
        totalScore += sectionScore;
    });

    return { totalScore, sectionScores };
}
