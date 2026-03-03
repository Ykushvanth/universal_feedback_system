/**
 * Axios Instance Configuration
 * Centralized HTTP client with interceptors
 */

import axios from 'axios';
import { API_CONFIG } from './api';

// Create axios instance
const axiosInstance = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    headers: API_CONFIG.HEADERS
});

// Request interceptor - Add auth token
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - Handle errors
axiosInstance.interceptors.response.use(
    (response) => {
        return response.data;
    },
    (error) => {
        if (error.response) {
            // Server responded with error
            const { status, data } = error.response;
            
            if (status === 401) {
                // Unauthorized - clear token and redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
            
            return Promise.reject(data || error.message);
        } else if (error.request) {
            // Request made but no response
            return Promise.reject({ message: 'No response from server' });
        } else {
            // Something else happened
            return Promise.reject({ message: error.message });
        }
    }
);

export default axiosInstance;
