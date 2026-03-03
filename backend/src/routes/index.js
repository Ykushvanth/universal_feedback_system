/**
 * API Routes Index
 */

const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const formRoutes = require('./formRoutes');
const responseRoutes = require('./responseRoutes');
const analysisRoutes = require('./analysisRoutes');

// Health check for API
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString()
    });
});

// Route mounting
router.use('/auth', authRoutes);
router.use('/forms', formRoutes);
router.use('/responses', responseRoutes);
router.use('/analysis', analysisRoutes);

// API info endpoint
router.get('/', (req, res) => {
    res.json({
        message: 'Feedback System API v1.0.0',
        endpoints: {
            auth: '/api/auth',
            forms: '/api/forms',
            responses: '/api/responses',
            analysis: '/api/analysis'
        },
        status: 'active'
    });
});

module.exports = router;
