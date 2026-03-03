/**
 * API Configuration
 * Centralized API base URL and default settings
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const API_CONFIG = {
    BASE_URL: API_BASE_URL,
    TIMEOUT: 30000, // 30 seconds
    HEADERS: {
        'Content-Type': 'application/json'
    }
};

export default API_BASE_URL;
