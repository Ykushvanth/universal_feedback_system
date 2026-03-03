/**
 * Analysis Service
 * Business logic for analytics and AI-powered analysis
 */

const ResponseModel = require('../models/Response');
const FormModel = require('../models/Form');
const AIService = require('./aiService');
const { supabase } = require('../config/database');
const { logger } = require('../utils/logger');

class AnalysisService {
    /**
     * Get comprehensive analysis for a form
     */
    static async getFormAnalysis(formId, filters = {}, userId) {
        try {
            // Check if form exists and user owns it
            const form = await FormModel.findById(formId);

            if (!form) {
                throw new Error('Form not found');
            }

            if (form.created_by !== userId) {
                throw new Error('Unauthorized to view analysis');
            }

            // Get filtered responses
            const responses = await ResponseModel.getByFormId(formId, filters);

            // Calculate basic statistics
            const basicStats = this.calculateBasicStatistics(responses, form);

            // Get AI sentiment analysis
            const sentimentAnalysis = await AIService.analyzeResponseComments(responses);

            // Get question-wise analysis
            const questionAnalysis = this.calculateQuestionAnalysis(responses, form);

            // Calculate score statistics if form has scoring
            const scoreStats = this.calculateScoreStatistics(responses, form);

            // Store analysis in database
            await this.storeAnalysis(formId, filters, {
                basicStats,
                sentimentAnalysis,
                questionAnalysis,
                scoreStats
            });

            // Build per-question sentiment map from AI analysis results
            const questionSentimentMap = {};
            (sentimentAnalysis.analyses || []).forEach(a => {
                if (!questionSentimentMap[a.questionId]) {
                    questionSentimentMap[a.questionId] = [];
                }
                questionSentimentMap[a.questionId].push(a);
            });

            // Normalize question_analysis: convert object-keyed-by-id → array with flat fields
            // AI sentiment is only computed for text/textarea (open comment) questions
            const questionAnalysisArray = Object.values(questionAnalysis).map(q => {
                const isTextType = q.question_type === 'text' || q.question_type === 'textarea';
                const qSentiments = questionSentimentMap[q.question_id] || [];
                // Generate per-question AI sentiment summary only for open-text/comment questions
                const qSentimentSummary = (isTextType && qSentiments.length > 0)
                    ? AIService.generateSummary(qSentiments)
                    : null;

                return {
                    question_id: q.question_id,
                    question_text: q.question_text,
                    question_type: q.question_type,
                    section_id: q.section_id,
                    section_title: q.section_title,
                    total_responses: q.total_responses,
                    response_rate: basicStats.total_responses > 0
                        ? parseFloat(((q.total_responses / basicStats.total_responses) * 100).toFixed(1))
                        : 0,
                    average_rating: q.average_rating ? parseFloat(q.average_rating) : null,
                    question_score: q.question_score !== undefined ? q.question_score : null,
                    // Option distribution only for choice/rating questions
                    option_distribution: isTextType ? {} : Object.fromEntries(
                        Object.entries(q.answers || {}).map(([k, v]) => [k, typeof v === 'object' ? v.count : v])
                    ),
                    // Open-text question specific: negative comments from live AI analysis
                    sample_comments: [],
                    negative_comments: isTextType
                        ? qSentiments
                            .filter(a => a.sentiment === 'negative')
                            .map(a => ({ text: a.comment, confidence: a.confidence || 0 }))
                        : [],
                    ai_sentiment: qSentimentSummary
                };
            });

            // Build sentiment_distribution as { SentimentName: count } for the pie chart
            const rawDist = sentimentAnalysis.summary?.sentiment_distribution || {};
            const sentimentDistribution = Object.fromEntries(
                Object.entries(rawDist).map(([k, v]) => [k, typeof v === 'object' ? v.count : v])
            );

            // Build section-wise analysis
            const sectionAnalysis = this.buildSectionAnalysis(questionAnalysisArray, form);

            // Overall score = average of section scores (scoring sections/questions only)
            const scoringSections = sectionAnalysis.filter(s => s.section_score !== null);
            const overallScore = scoringSections.length > 0
                ? parseFloat((scoringSections.reduce((sum, s) => sum + s.section_score, 0) / scoringSections.length).toFixed(1))
                : null;

            return {
                form_id: formId,
                form_title: form.title,
                filters: filters,
                total_responses: basicStats.total_responses,
                completion_rate: basicStats.total_responses === 0 ? 0 : (parseFloat(basicStats.completion_rate) || 100),
                // Overall score (average of section scores, text/textarea excluded)
                overall_score: overallScore,
                // Sentiment only for open-text questions
                has_text_questions: questionAnalysisArray.some(q => q.question_type === 'text' || q.question_type === 'textarea'),
                overall_sentiment: sentimentAnalysis.analyses?.length > 0
                    ? (sentimentAnalysis.summary?.overall_sentiment || 'neutral')
                    : 'not_applicable',
                sentiment_distribution: sentimentDistribution,
                // Section-wise and question-wise analysis
                section_analysis: sectionAnalysis,
                question_analysis: questionAnalysisArray,
                response_distribution: basicStats.response_distribution || {},
                sentiment_details: sentimentAnalysis.summary || {},
                generated_at: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Get form analysis service error:', error);
            throw error;
        }
    }

    /**
     * Build section-wise analysis (scores per section, skipping non-scoring questions)
     */
    static buildSectionAnalysis(questionAnalysisArray, form) {
        // Map section metadata from form definition
        const sectionMeta = {};
        form.sections.forEach(section => {
            sectionMeta[section.id] = {
                section_id: section.id,
                section_title: section.title,
                scoring_enabled: section.scoring_enabled || false,
                total_questions: section.questions.length,
                scoring_question_count: 0,
                section_score: null,
                _scores: []
            };
        });

        // Accumulate question scores into sections
        questionAnalysisArray.forEach(q => {
            const sec = sectionMeta[q.section_id];
            if (!sec) return;
            if (q.question_score !== null && q.question_score !== undefined) {
                sec._scores.push(q.question_score);
                sec.scoring_question_count++;
            }
        });

        // Compute section score as average of scoring question scores
        const result = Object.values(sectionMeta).map(sec => {
            if (sec._scores.length > 0) {
                const avg = sec._scores.reduce((a, b) => a + b, 0) / sec._scores.length;
                sec.section_score = parseFloat(avg.toFixed(1));
            }
            delete sec._scores;
            return sec;
        });

        return result;
    }

    /**
     * Build key insights from analysis data (kept for internal use)
     */
    static buildKeyInsights(basicStats, sentimentAnalysis, questionAnalysisArray, form) {
        const insights = [];

        // Response count insight
        if (basicStats.total_responses > 0) {
            insights.push(`${basicStats.total_responses} response(s) collected for this form.`);
        }

        // Sentiment insight
        const overall = sentimentAnalysis.summary?.overall_sentiment;
        if (overall && basicStats.total_responses > 0) {
            const sentimentLabel = overall.replace('_', ' ');
            insights.push(`Overall feedback sentiment is ${sentimentLabel}.`);
        }

        // Top rated question insight
        const ratedQuestions = questionAnalysisArray.filter(q => q.average_rating !== null);
        if (ratedQuestions.length > 0) {
            const top = ratedQuestions.reduce((a, b) => a.average_rating > b.average_rating ? a : b);
            insights.push(`Highest rated: "${top.question_text}" with avg rating ${top.average_rating.toFixed(1)}/5.`);
        }

        // Most-selected option insight per question
        questionAnalysisArray.forEach(q => {
            const entries = Object.entries(q.option_distribution || {});
            if (entries.length > 0 && q.total_responses > 0) {
                const top = entries.reduce((a, b) => a[1] > b[1] ? a : b);
                const pct = ((top[1] / q.total_responses) * 100).toFixed(0);
                if (pct >= 50) {
                    insights.push(`For "${q.question_text}", ${pct}% chose "${top[0]}".`);
                }
            }
        });

        return insights.slice(0, 6); // Limit to 6 insights
    }

    /**
     * Calculate basic statistics
     */
    static calculateBasicStatistics(responses, form) {
        const total = responses.length;

        if (total === 0) {
            return {
                total_responses: 0,
                completion_rate: '0.00%',
                average_response_time: null
            };
        }

        return {
            total_responses: total,
            completion_rate: '100.00%', // All submitted responses are complete
            response_distribution: this.getResponseDistribution(responses)
        };
    }

    /**
     * Get response distribution over time
     */
    static getResponseDistribution(responses) {
        const distribution = {};

        responses.forEach(response => {
            const date = new Date(response.submitted_at).toISOString().split('T')[0];
            distribution[date] = (distribution[date] || 0) + 1;
        });

        return distribution;
    }

    /**
     * Calculate question-wise analysis
     */
    static calculateQuestionAnalysis(responses, form) {
        const questionStats = {};

        // Initialize stats for each question
        form.sections.forEach(section => {
            section.questions.forEach(question => {
                questionStats[question.id] = {
                    question_id: question.id,
                    question_text: question.text,
                    question_type: question.type,
                    section_id: section.id,
                    section_title: section.title,
                    total_responses: 0,
                    answers: {},
                    // Scoring metadata from form definition
                    _options: question.options || [],
                    _option_scores: question.option_scores || {},
                    _max_score: question.max_score || 0,
                    score_sum: 0
                };
            });
        });

        // Count answers
        responses.forEach(response => {
            if (response.answers && Array.isArray(response.answers)) {
                response.answers.forEach(answer => {
                    if (questionStats[answer.question_id]) {
                        questionStats[answer.question_id].total_responses++;

                        // For choice-based questions, count each option
                        if (answer.type === 'radio' || answer.type === 'checkbox') {
                            const value = answer.value;
                            const stat = questionStats[answer.question_id];
                            const oScores = stat._option_scores || {};
                            if (Array.isArray(value)) {
                                value.forEach(v => {
                                    stat.answers[v] = (stat.answers[v] || 0) + 1;
                                    if (Object.keys(oScores).length > 0 && oScores[v] !== undefined) {
                                        stat.score_sum += (oScores[v] || 0);
                                    }
                                });
                            } else {
                                stat.answers[value] = (stat.answers[value] || 0) + 1;
                                if (Object.keys(oScores).length > 0 && oScores[value] !== undefined) {
                                    stat.score_sum += (oScores[value] || 0);
                                }
                            }
                        }

                        // For rating questions, calculate average
                        if (answer.type === 'rating') {
                            if (!questionStats[answer.question_id].ratings) {
                                questionStats[answer.question_id].ratings = [];
                            }
                            questionStats[answer.question_id].ratings.push(parseFloat(answer.value));
                        }

                        // For open-text/comment questions, collect the raw answers
                        if (answer.type === 'text' || answer.type === 'textarea') {
                            if (answer.value && typeof answer.value === 'string' && answer.value.trim()) {
                                const stat = questionStats[answer.question_id];
                                if (!stat.text_answers) stat.text_answers = [];
                                stat.text_answers.push(answer.value.trim());

                                // Collect AI-flagged negative comments separately
                                // (sentiment is stored on each answer by the background AI job)
                                if (answer.sentiment === 'negative') {
                                    if (!stat.negative_comments) stat.negative_comments = [];
                                    stat.negative_comments.push({
                                        text:       answer.value.trim(),
                                        confidence: answer.sentiment_confidence ?? 0
                                    });
                                }
                            }
                        }
                    }
                });
            }
        });

        // Calculate percentages, averages, and per-question score
        Object.values(questionStats).forEach(stat => {
            if (stat.total_responses > 0) {
                // Convert counts to percentages
                Object.keys(stat.answers).forEach(key => {
                    const count = stat.answers[key];
                    stat.answers[key] = {
                        count,
                        percentage: ((count / stat.total_responses) * 100).toFixed(2)
                    };
                });

                // Calculate average rating
                if (stat.ratings && stat.ratings.length > 0) {
                    const sum = stat.ratings.reduce((a, b) => a + b, 0);
                    stat.average_rating = (sum / stat.ratings.length).toFixed(2);
                    delete stat.ratings;
                }

                // ── Question score (0-100 scale) ────────────────────────────────
                const isTextType = stat.question_type === 'text' || stat.question_type === 'textarea';

                if (isTextType) {
                    stat.question_score = null; // non-scoring

                } else if (stat.question_type === 'rating') {
                    const avgRating = parseFloat(stat.average_rating || 0);
                    const maxRating = stat._max_score > 0 ? stat._max_score : 5;
                    stat.question_score = parseFloat((avgRating / maxRating * 100).toFixed(1));

                } else if (stat.question_type === 'radio' || stat.question_type === 'checkbox') {
                    const oScores = stat._option_scores || {};
                    const hasOptionScores = Object.keys(oScores).length > 0;

                    if (hasOptionScores) {
                        // Use admin-defined option scores
                        const effectiveMax = stat._max_score > 0
                            ? stat._max_score
                            : Math.max(...Object.values(oScores).map(Number), 1);
                        stat.question_score = parseFloat(
                            (stat.score_sum / (stat.total_responses * effectiveMax) * 100).toFixed(1)
                        );
                    } else {
                        // Fallback: weight by option index (option[0]=0, option[N-1]=N-1)
                        const options = stat._options.length > 0
                            ? stat._options
                            : Object.keys(stat.answers);
                        const N = options.length;
                        if (N > 1) {
                            let weightedSum = 0;
                            options.forEach((opt, idx) => {
                                const cnt = typeof stat.answers[opt] === 'object'
                                    ? stat.answers[opt].count
                                    : (stat.answers[opt] || 0);
                                weightedSum += cnt * idx;
                            });
                            stat.question_score = parseFloat(
                                (weightedSum / (stat.total_responses * (N - 1)) * 100).toFixed(1)
                            );
                        } else {
                            stat.question_score = null;
                        }
                    }
                } else {
                    stat.question_score = null;
                }
            } else {
                stat.question_score = null;
            }

            // Clean up internal metadata
            delete stat._options;
            delete stat._option_scores;
            delete stat._max_score;
            delete stat.score_sum;
        });

        return questionStats;
    }

    /**
     * Calculate score statistics
     */
    static calculateScoreStatistics(responses, form) {
        // Check if form has scoring
        const hasScoring = form.sections.some(section => 
            section.questions.some(q => q.max_score !== undefined && q.max_score > 0)
        );

        if (!hasScoring || responses.length === 0) {
            return null;
        }

        const scores = responses
            .map(r => r.scores?.total_score || 0)
            .filter(s => s > 0);

        if (scores.length === 0) {
            return null;
        }

        scores.sort((a, b) => a - b);

        const sum = scores.reduce((a, b) => a + b, 0);
        const average = sum / scores.length;
        const median = scores[Math.floor(scores.length / 2)];
        const min = scores[0];
        const max = scores[scores.length - 1];

        // Calculate score distribution
        const maxScore = form.settings?.total_max_score || 100;
        const ranges = this.getScoreRanges(scores, maxScore);

        return {
            total_responses_with_scores: scores.length,
            max_possible_score: maxScore,
            average_score: average.toFixed(2),
            median_score: median.toFixed(2),
            min_score: min.toFixed(2),
            max_score: max.toFixed(2),
            score_distribution: ranges
        };
    }

    /**
     * Get score ranges
     */
    static getScoreRanges(scores, maxScore) {
        const rangeSize = maxScore / 5;
        const ranges = {
            'very_low': { min: 0, max: rangeSize, count: 0 },
            'low': { min: rangeSize, max: rangeSize * 2, count: 0 },
            'medium': { min: rangeSize * 2, max: rangeSize * 3, count: 0 },
            'high': { min: rangeSize * 3, max: rangeSize * 4, count: 0 },
            'very_high': { min: rangeSize * 4, max: maxScore, count: 0 }
        };

        scores.forEach(score => {
            if (score < rangeSize) ranges.very_low.count++;
            else if (score < rangeSize * 2) ranges.low.count++;
            else if (score < rangeSize * 3) ranges.medium.count++;
            else if (score < rangeSize * 4) ranges.high.count++;
            else ranges.very_high.count++;
        });

        return ranges;
    }

    /**
     * Generate Department/Faculty-wise tabular report
     * Groups responses by general_detail fields and computes per-question scores per group
     */
    static async getTabularReport(formId, filters = {}, userId) {
        try {
            const form = await FormModel.findById(formId);
            if (!form) throw new Error('Form not found');
            if (form.created_by !== userId) throw new Error('Unauthorized to view analysis');

            const responses = await ResponseModel.getByFormId(formId, filters);

            // ── Build a flat ordered list of questions from form definition ──
            const allQuestions = [];
            form.sections.forEach(section => {
                section.questions.forEach(q => {
                    allQuestions.push({
                        question_id:   q.id,
                        question_text: q.text,
                        question_type: q.type,
                        section_id:    section.id,
                        section_title: section.title,
                        options:       q.options || [],
                        option_scores: q.option_scores || {},
                        max_score:     q.max_score || 0
                    });
                });
            });

            // ── Determine grouping key fields from first response's general_details ──
            // We try to use the form's general_detail_fields definition; fall back to all keys
            const gdfFields = (form.settings?.general_detail_fields || []).map(f => f.name);
            const sampleDetails = responses.length > 0 ? (responses[0].general_details || {}) : {};
            const allDetailKeys = gdfFields.length > 0 ? gdfFields : Object.keys(sampleDetails);

            // Fields that are "identity" columns (used as row keys), not score fields
            const SCORE_LIKE = ['score_1','score_2','cgpa','total_score','score','marks'];
            const identityKeys = allDetailKeys.filter(k => !SCORE_LIKE.includes(k.toLowerCase()));
            const scoreKeys    = allDetailKeys.filter(k =>  SCORE_LIKE.includes(k.toLowerCase()));

            // ── Group responses by identity key combination ──
            const groups = {}; // key → { details, responses[] }
            responses.forEach(resp => {
                const gd = resp.general_details || {};
                const groupKey = identityKeys.map(k => String(gd[k] || '')).join('__||__');
                if (!groups[groupKey]) {
                    groups[groupKey] = {
                        details: gd,
                        identityKeys,
                        scoreKeys,
                        responses: []
                    };
                }
                groups[groupKey].responses.push(resp);
            });

            // ── For each group, calculate per-question scores ──
            const rows = Object.values(groups).map(group => {
                const questionScores = {};

                allQuestions.forEach(q => {
                    const isText = q.question_type === 'text' || q.question_type === 'textarea';
                    let total = 0, scoreSum = 0, ratingSum = 0, ratingCount = 0;
                    const optCounts = {};

                    group.responses.forEach(resp => {
                        const ans = (resp.answers || []).find(a => a.question_id === q.question_id);
                        if (!ans) return;
                        total++;

                        if (isText) return;

                        if (q.question_type === 'rating') {
                            const v = parseFloat(ans.value);
                            if (!isNaN(v)) { ratingSum += v; ratingCount++; }
                        } else if (q.question_type === 'radio' || q.question_type === 'checkbox') {
                            const vals = Array.isArray(ans.value) ? ans.value : [ans.value];
                            vals.forEach(v => {
                                optCounts[v] = (optCounts[v] || 0) + 1;
                                const os = q.option_scores || {};
                                if (Object.keys(os).length > 0 && os[v] !== undefined) {
                                    scoreSum += Number(os[v]);
                                }
                            });
                        }
                    });

                    let questionScore = null;
                    if (!isText && total > 0) {
                        if (q.question_type === 'rating') {
                            const avg = ratingCount > 0 ? ratingSum / ratingCount : 0;
                            const maxR = q.max_score > 0 ? q.max_score : 5;
                            questionScore = parseFloat((avg / maxR * 100).toFixed(1));
                        } else if (q.question_type === 'radio' || q.question_type === 'checkbox') {
                            const hasScores = Object.keys(q.option_scores || {}).length > 0;
                            if (hasScores) {
                                const effMax = q.max_score > 0 ? q.max_score : Math.max(...Object.values(q.option_scores).map(Number), 1);
                                questionScore = parseFloat((scoreSum / (total * effMax) * 100).toFixed(1));
                            } else {
                                const opts = q.options.length > 0 ? q.options : Object.keys(optCounts);
                                const N = opts.length;
                                if (N > 1) {
                                    let wSum = 0;
                                    opts.forEach((opt, idx) => { wSum += (optCounts[opt] || 0) * idx; });
                                    questionScore = parseFloat((wSum / (total * (N - 1)) * 100).toFixed(1));
                                }
                            }
                        }
                    }

                    questionScores[q.question_id] = {
                        score: isText ? null : questionScore,
                        total_responses: total,
                        option_distribution: isText ? {} : optCounts
                    };
                });

                // Compute section-level scores from question scores
                const sectionScores = {};
                form.sections.forEach(sec => {
                    const secQs = allQuestions.filter(q => q.section_id === sec.id && q.question_type !== 'text' && q.question_type !== 'textarea');
                    const scores = secQs.map(q => questionScores[q.question_id]?.score).filter(s => s !== null && s !== undefined);
                    sectionScores[sec.id] = scores.length > 0
                        ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
                        : null;
                });

                const allSectionScoreValues = Object.values(sectionScores).filter(s => s !== null);
                const finalScore = allSectionScoreValues.length > 0
                    ? parseFloat((allSectionScoreValues.reduce((a, b) => a + b, 0) / allSectionScoreValues.length).toFixed(1))
                    : null;

                return {
                    identity: Object.fromEntries(identityKeys.map(k => [k, group.details[k] || ''])),
                    scores_extra: Object.fromEntries(scoreKeys.map(k => [k, group.details[k] || ''])),
                    response_count: group.responses.length,
                    question_scores: questionScores,
                    section_scores: sectionScores,
                    final_score: finalScore
                };
            });

            return {
                form_id:      formId,
                form_title:   form.title,
                filters,
                questions:    allQuestions,
                sections:     form.sections.map(s => ({ id: s.id, title: s.title })),
                identity_keys: identityKeys,
                score_keys:    scoreKeys,
                rows,
                total_responses: responses.length,
                generated_at: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Get tabular report service error:', error);
            throw error;
        }
    }

    /**
     * Store analysis in database
     */
    static async storeAnalysis(formId, filters, analysis) {
        try {
            const { error } = await supabase
                .from('ai_analysis')
                .insert([{
                    form_id: formId,
                    filter_criteria: filters,
                    statistics: {
                        basicStats: analysis.basicStats,
                        questionAnalysis: analysis.questionAnalysis,
                        scoreStats: analysis.scoreStats,
                        sentimentSummary: analysis.sentimentAnalysis?.summary || null
                    }
                }]);

            if (error) {
                // Non-fatal: log at debug level only (schema may differ across environments)
                logger.debug('Store analysis (non-fatal):', error.message);
            }

            return true;
        } catch (error) {
            logger.error('Store analysis error:', error);
            return false;
        }
    }

    /**
     * Get cached analysis
     */
    static async getCachedAnalysis(formId, filters, userId) {
        try {
            // Check ownership
            const form = await FormModel.findById(formId);
            if (!form || form.created_by !== userId) {
                throw new Error('Unauthorized');
            }

            const { data, error } = await supabase
                .from('ai_analysis')
                .select('*')
                .eq('form_id', formId)
                .contains('filter_criteria', filters)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data;
        } catch (error) {
            logger.error('Get cached analysis error:', error);
            return null;
        }
    }
}

module.exports = AnalysisService;
