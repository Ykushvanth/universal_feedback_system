/**
 * AI Service
 * Integration with Hugging Face API for sentiment analysis
 */

const axios = require('axios');
const { logger } = require('../utils/logger');
const config = require('../config/env');

// Comments that look negative to the HF model due to a leading "No/Nothing/Not" but
// are actually neutral non-responses (no feedback given).  Applied both to fresh HF
// results AND to already-cached DB values so stale wrong entries are corrected.
const NO_FEEDBACK_RE = /^(no[.,!\s]*$|no[\s,]*(suggestion|improvement|improvements|issue|problem|comment|thanks|all\s+good|all good|more\s+improvement|more improvement|more|nothing|not\s+at\s+all|not at all|,\s*not\s+at\s+all)[\s.]*$|no\s+(improvement|improvements|suggestion|suggestions)\s+(needed|required|necessary)[\s.]*$|not\s+needed[\s.]*$|not\s+required[\s.]*$|nothing[.,!\s]*(already\s+)?(great|good|fine|perfect|excellent|satisfied)\b.*$|i\s+have\s+no\s+(suggestion|suggestions|improvement|improvements|comment|feedback|complaint|issue|problem)[\s.,!]*$|everything\s+is\s+(great|good|fine|perfect|excellent)\b.*$|until\s+now\s+there\s+is\s+no\s+problem\b.*$|nothing\s+to\s+(improve|suggest|add|change|say|tell)[\s.]*$)/;

// Default neutral result returned whenever AI analysis cannot be completed
const neutralResult = () => ({
    sentiment: 'neutral',
    confidence: 0,
    vader_score: 0,
    roberta_scores: { negative: 0, neutral: 1, positive: 0 },
    pattern_matched: false,
    pattern_type: null,
    ai_analyzed: false          // flag so callers know this is a fallback
});

class AIService {
    /**
     * Call Hugging Face sentiment analysis API.
     *
     * API contract (kushvanth-iqac-fast-api):
     *   POST /analyze-comments
     *   Request : { comments: string[], faculty_info: { faculty_name, staff_id, course_code, course_name } }
     *   Response: { success: bool, analysis: { negative_comments_list: string[],
     *               overall_sentiment, positive_comments, negative_comments,
     *               neutral_comments, positive_sentiment, negative_sentiment,
     *               neutral_sentiment, ... } }
     *
     * NEVER throws — always returns an array of per-text results (or neutral fallbacks).
     */
    static async analyzeSentiment(texts) {
        // ── 1. Normalise input ──────────────────────────────────────────────
        if (!Array.isArray(texts)) texts = [texts];
        const originalTexts = [...texts];

        const validEntries = originalTexts
            .map((text, idx) => ({ text, idx }))
            .filter(({ text }) => text && String(text).trim().length > 0);

        if (validEntries.length === 0) {
            logger.info('AI Service: no valid texts to analyse, skipping HF call');
            return originalTexts.map(neutralResult);
        }

        // ── 2. Configuration checks ─────────────────────────────────────────
        const apiUrl = config.ai?.apiUrl;

        if (!apiUrl ||
            apiUrl.includes('your-huggingface-space') ||
            apiUrl.includes('YOUR_HUGGING_FACE')) {
            logger.warn('AI Service: AI_ANALYSIS_API_URL is not configured. Returning neutral defaults.');
            return originalTexts.map(neutralResult);
        }

        if (config.ai?.enabled === false) {
            logger.info('AI Service: AI analysis is disabled via config. Returning neutral defaults.');
            return originalTexts.map(neutralResult);
        }

        const validTexts = validEntries.map(e => e.text.trim());

        // ── 3. Call HF Space in batches of 1000 (API hard limit) ────────────
        // FastAPI rejects requests with > max_comments_per_request (1000) texts
        // with HTTP 422. We split into batches and merge the negative_comments_list.
        const BATCH_SIZE = 1000;
        const timeout    = config.ai?.timeout || 90000;
        const maxRetry   = 2;
        const norm       = t => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim();

        // Helper: call the API for a single batch, returns the analysis object or null
        const callBatch = async (batchTexts, batchIndex) => {
            let lastErr = null;
            for (let attempt = 1; attempt <= maxRetry; attempt++) {
                try {
                    logger.info(
                        `AI Service: batch ${batchIndex + 1} — attempt ${attempt}/${maxRetry} ` +
                        `with ${batchTexts.length} comment(s)`
                    );
                    const response = await axios.post(
                        apiUrl,
                        {
                            comments: batchTexts,
                            faculty_info: {
                                faculty_name: 'Feedback Analysis',
                                staff_id:     'N/A',
                                course_code:  'GEN',
                                course_name:  'General Feedback'
                            }
                        },
                        { timeout, headers: { 'Content-Type': 'application/json' } }
                    );

                    const apiData = response?.data;
                    if (!apiData?.success || !apiData?.analysis) {
                        logger.warn(`AI Service: unexpected response for batch ${batchIndex + 1}:`, JSON.stringify(apiData));
                        return null;
                    }
                    return apiData.analysis;

                } catch (err) {
                    lastErr = err;
                    const status  = err?.response?.status;
                    const errMsg  = err?.response?.data?.detail ||
                                    err?.response?.data?.message ||
                                    err?.message || 'unknown error';

                    if (status === 503 && attempt < maxRetry) {
                        logger.warn(`AI Service: HF Space 503 on batch ${batchIndex + 1}. Retrying in 10 s…`);
                        await new Promise(r => setTimeout(r, 10000));
                        continue;
                    }

                    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
                        logger.error(`AI Service: batch ${batchIndex + 1} timed out`);
                    } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
                        logger.error(`AI Service: cannot reach HF API — ${err.code}`);
                    } else if (status) {
                        logger.error(`AI Service: HF API HTTP ${status} on batch ${batchIndex + 1} — ${errMsg}`);
                    } else {
                        logger.error(`AI Service: unexpected error on batch ${batchIndex + 1} — ${errMsg}`, err);
                    }
                    break;
                }
            }
            if (lastErr) logger.warn(`AI Service: batch ${batchIndex + 1} failed; will use neutral defaults for this batch`);
            return null;
        };

        // Split validTexts into chunks and call API for each
        const batches = [];
        for (let i = 0; i < validTexts.length; i += BATCH_SIZE) {
            batches.push(validTexts.slice(i, i + BATCH_SIZE));
        }

        logger.info(`AI Service: ${validTexts.length} comment(s) → ${batches.length} batch(es) of ≤ ${BATCH_SIZE} (sequential)`);

        // Sequential — HF Space is single-worker; parallel requests queue up and
        // cause all but the first to time out waiting in line.
        const batchResults = [];
        for (let i = 0; i < batches.length; i++) {
            batchResults.push(await callBatch(batches[i], i));
        }

        // Merge: collect all negative comments across batches; aggregate counts
        const mergedNegativeSet = new Set();
        let totalPos = 0, totalNeg = 0, totalNeu = 0;
        let posSentScore = 0, negSentScore = 0, neuSentScore = 0;
        let validBatches = 0;

        batchResults.forEach(analysis => {
            if (!analysis) return;
            validBatches++;
            (analysis.negative_comments_list || []).forEach(t => mergedNegativeSet.add(norm(t)));
            totalPos += analysis.positive_comments || 0;
            totalNeg += analysis.negative_comments || 0;
            totalNeu += analysis.neutral_comments  || 0;
            posSentScore += analysis.positive_sentiment || 0;
            negSentScore += analysis.negative_sentiment || 0;
            neuSentScore += analysis.neutral_sentiment  || 0;
        });

        if (validBatches === 0) {
            logger.warn('AI Service: all batches failed. Returning neutral defaults.');
            return originalTexts.map(neutralResult);
        }

        const avgPosSent = posSentScore / validBatches;
        const avgNegSent = negSentScore / validBatches;
        const avgNeuSent = neuSentScore / validBatches;
        const nonNegSentiment  = totalPos >= totalNeu ? 'positive' : 'neutral';
        const nonNegConfidence = totalPos >= totalNeu ? avgPosSent || 0.7 : avgNeuSent || 0.5;

        // ── 4. Map back to original-text array ──────────────────────────────
        // NO_FEEDBACK_RE (module-level) overrides wrongly-flagged neutral non-responses.
        const output = originalTexts.map(neutralResult);
        validEntries.forEach(({ text, idx }) => {
            const normalizedText = norm(text);
            const isNegative = mergedNegativeSet.has(normalizedText) && !NO_FEEDBACK_RE.test(normalizedText);
            output[idx] = {
                sentiment:       isNegative ? 'negative' : nonNegSentiment,
                confidence:      isNegative ? (avgNegSent || 0.85) : nonNegConfidence,
                vader_score:     0,
                roberta_scores:  { negative: 0, neutral: 0, positive: 0 },
                pattern_matched: false,
                pattern_type:    null,
                ai_analyzed:     true
            };
        });

        logger.info(
            `AI Service: merged ${batches.length} batch(es) — ` +
            `${totalNeg} negative, ${totalPos} positive, ${totalNeu} neutral.`
        );
        return output;
    }

    /**
     * Analyze all text/textarea comments in a set of responses.
     *
     * NEVER throws — returns empty analyses + empty summary on any failure.
     */
    static async analyzeResponseComments(responses) {
        try {
            if (!Array.isArray(responses) || responses.length === 0) {
                return { analyses: [], summary: this.getEmptySummary(), newAnalyses: [] };
            }

            // Separate comments that already have a stored AI result from ones that need
            // a fresh HF API call.  On the first analysis run every comment is sent to the
            // API; results are written back to the DB (see analysisService).  On every
            // subsequent run the stored values are reused instantly — only new submissions
            // (ai_analyzed === false) are sent to the API.
            const cachedAnalyses  = [];
            const newComments     = [];
            const newCommentMappings = [];

            responses.forEach((response, responseIndex) => {
                if (!response.answers || !Array.isArray(response.answers)) return;
                response.answers.forEach((answer, answerIndex) => {
                    if (
                        (answer.type === 'text' || answer.type === 'textarea') &&
                        answer.value &&
                        typeof answer.value === 'string' &&
                        answer.value.trim().length > 0
                    ) {
                        const mapping = {
                            responseIndex,
                            answerIndex,
                            responseId: response.response_id,
                            questionId: answer.question_id
                        };

                        if (answer.ai_analyzed === true) {
                            // Reuse the stored result — but re-apply NO_FEEDBACK_RE so any
                            // comments that were wrongly stored as "negative" before the
                            // pattern fix are corrected on the fly without re-calling the API.
                            const normVal = String(answer.value || '').toLowerCase().replace(/\s+/g, ' ').trim();
                            const storedSentiment = (answer.sentiment || 'neutral') === 'negative' && NO_FEEDBACK_RE.test(normVal)
                                ? 'neutral'
                                : (answer.sentiment || 'neutral');
                            cachedAnalyses.push({
                                ...mapping,
                                comment:        answer.value.trim(),
                                sentiment:      storedSentiment,
                                confidence:     answer.sentiment_confidence ?? 0,
                                vader_score:    0,
                                roberta_scores: { negative: 0, neutral: 1, positive: 0 },
                                pattern_matched: false,
                                pattern_type:   null,
                                ai_analyzed:    true
                            });
                        } else {
                            newComments.push(answer.value.trim());
                            newCommentMappings.push(mapping);
                        }
                    }
                });
            });

            const totalComments = cachedAnalyses.length + newComments.length;
            if (totalComments === 0) {
                logger.info('AI Service: no text comments found in responses');
                return { analyses: [], summary: this.getEmptySummary(), newAnalyses: [] };
            }

            if (newComments.length === 0) {
                logger.info(`AI Service: all ${cachedAnalyses.length} comment(s) already analyzed — skipping HF API call`);
                const summary = this.generateSummary(cachedAnalyses);
                return { analyses: cachedAnalyses, summary, newAnalyses: [] };
            }

            logger.info(
                `AI Service: ${newComments.length} new comment(s) to analyze ` +
                `(${cachedAnalyses.length} already cached) from ${responses.length} response(s)`
            );

            // analyzeSentiment never throws — always returns an array
            const sentiments = await this.analyzeSentiment(newComments);

            const newAnalyses = sentiments.map((sentiment, index) => {
                const mapping = newCommentMappings[index];
                if (!mapping) return null;
                return {
                    ...mapping,
                    comment: newComments[index],
                    ...sentiment
                };
            }).filter(Boolean);

            const allAnalyses = [...cachedAnalyses, ...newAnalyses];
            const summary = this.generateSummary(allAnalyses);

            return { analyses: allAnalyses, summary, newAnalyses };
        } catch (error) {
            logger.error('AI Service: analyzeResponseComments failed unexpectedly:', error);
            return { analyses: [], summary: this.getEmptySummary(), newAnalyses: [] };
        }
    }

    /**
     * Generate summary from sentiment analyses
     */
    static generateSummary(analyses) {
        const total = analyses.length;

        if (total === 0) {
            return this.getEmptySummary();
        }

        const sentimentCounts = {
            positive: 0,
            negative: 0,
            neutral: 0
        };

        const patternCounts = {
            complaint: 0,
            suggestion: 0,
            praise: 0,
            none: 0
        };

        let totalConfidence = 0;
        let totalVaderScore = 0;

        analyses.forEach(analysis => {
            sentimentCounts[analysis.sentiment]++;
            
            if (analysis.pattern_matched && analysis.pattern_type) {
                patternCounts[analysis.pattern_type]++;
            } else {
                patternCounts.none++;
            }

            totalConfidence += analysis.confidence;
            totalVaderScore += analysis.vader_score;
        });

        return {
            total_comments: total,
            sentiment_distribution: {
                positive: {
                    count: sentimentCounts.positive,
                    percentage: ((sentimentCounts.positive / total) * 100).toFixed(2)
                },
                negative: {
                    count: sentimentCounts.negative,
                    percentage: ((sentimentCounts.negative / total) * 100).toFixed(2)
                },
                neutral: {
                    count: sentimentCounts.neutral,
                    percentage: ((sentimentCounts.neutral / total) * 100).toFixed(2)
                }
            },
            pattern_distribution: {
                complaints: patternCounts.complaint,
                suggestions: patternCounts.suggestion,
                praise: patternCounts.praise,
                none: patternCounts.none
            },
            average_confidence: (totalConfidence / total).toFixed(4),
            average_vader_score: (totalVaderScore / total).toFixed(4),
            overall_sentiment: this.determineOverallSentiment(sentimentCounts, total)
        };
    }

    /**
     * Determine overall sentiment
     */
    static determineOverallSentiment(sentimentCounts, total) {
        const positiveRatio = sentimentCounts.positive / total;
        const negativeRatio = sentimentCounts.negative / total;

        if (positiveRatio > 0.6) return 'mostly_positive';
        if (negativeRatio > 0.6) return 'mostly_negative';
        if (positiveRatio > 0.4) return 'positive';
        if (negativeRatio > 0.4) return 'negative';
        return 'neutral';
    }

    /**
     * Get empty summary
     */
    static getEmptySummary() {
        return {
            total_comments: 0,
            sentiment_distribution: {
                positive: { count: 0, percentage: '0.00' },
                negative: { count: 0, percentage: '0.00' },
                neutral: { count: 0, percentage: '0.00' }
            },
            pattern_distribution: {
                complaints: 0,
                suggestions: 0,
                praise: 0,
                none: 0
            },
            average_confidence: '0.0000',
            average_vader_score: '0.0000',
            overall_sentiment: 'neutral'
        };
    }
}

module.exports = AIService;
