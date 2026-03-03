/**
 * Authentication API Service
 * Handles all authentication-related API calls
 */

import axios from '../config/axios';

const authService = {
    /**
     * Register new user
     */
    register: async (userData) => {
        const response = await axios.post('/auth/register', userData);
        
        if (response.data?.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        
        return response;
    },

    /**
     * Login user
     */
    login: async (email, password) => {
        const response = await axios.post('/auth/login', { email, password });
        
        if (response.data?.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            
            if (response.data.refreshToken) {
                localStorage.setItem('refreshToken', response.data.refreshToken);
            }
        }
        
        return response;
    },

    /**
     * Logout user
     */
    logout: async () => {
        try {
            await axios.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
        }
    },

    /**
     * Get current user profile
     */
    getProfile: async () => {
        const response = await axios.get('/auth/me');
        return response;
    },

    /**
     * Update profile
     */
    updateProfile: async (updates) => {
        const response = await axios.put('/auth/profile', updates);
        
        if (response.data?.user) {
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        
        return response;
    },

    /**
     * Refresh access token
     */
    refreshToken: async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }
        
        const response = await axios.post('/auth/refresh', { refreshToken });
        
        if (response.data?.token) {
            localStorage.setItem('token', response.data.token);
        }
        
        return response;
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated: () => {
        return !!localStorage.getItem('token');
    },

    /**
     * Get current user from local storage
     */
    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }
};

export default authService;
