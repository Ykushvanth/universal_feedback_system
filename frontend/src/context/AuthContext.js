/**
 * Authentication Context
 * Manages global authentication state
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Initialize auth state from localStorage
    useEffect(() => {
        const initAuth = () => {
            try {
                const token = localStorage.getItem('token');
                const userStr = localStorage.getItem('user');

                if (token && userStr) {
                    try {
                        const userData = JSON.parse(userStr);
                        setUser(userData);
                        setIsAuthenticated(true);
                    } catch (parseError) {
                        console.error('Error parsing user data:', parseError);
                        // Clear invalid data
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        localStorage.removeItem('refreshToken');
                        setUser(null);
                        setIsAuthenticated(false);
                    }
                } else {
                    setUser(null);
                    setIsAuthenticated(false);
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
                setUser(null);
                setIsAuthenticated(false);
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = async (email, password) => {
        try {
            const response = await authService.login(email, password);
            
            if (response && response.success && response.data && response.data.user) {
                setUser(response.data.user);
                setIsAuthenticated(true);
                return { success: true, user: response.data.user };
            }
            
            return { 
                success: false, 
                message: (response && response.message) || 'Login failed' 
            };
        } catch (error) {
            console.error('Login error:', error);
            return { 
                success: false, 
                message: (error && error.message) || 'Login failed. Please try again.' 
            };
        }
    };

    const register = async (userData) => {
        try {
            const response = await authService.register(userData);
            
            if (response && response.success && response.data && response.data.user) {
                setUser(response.data.user);
                setIsAuthenticated(true);
                return { success: true, user: response.data.user };
            }
            
            return { 
                success: false, 
                message: (response && response.message) || 'Registration failed' 
            };
        } catch (error) {
            console.error('Registration error:', error);
            return { 
                success: false, 
                message: (error && error.message) || 'Registration failed. Please try again.' 
            };
        }
    };

    const logout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('refreshToken');
        }
    };

    const updateUserProfile = async (updates) => {
        try {
            const response = await authService.updateProfile && await authService.updateProfile(updates);
            
            if (response && response.success && response.data && response.data.user) {
                setUser(response.data.user);
                return { success: true, user: response.data.user };
            }
            
            return { 
                success: false, 
                message: (response && response.message) || 'Update failed' 
            };
        } catch (error) {
            console.error('Update profile error:', error);
            return { 
                success: false, 
                message: (error && error.message) || 'Failed to update profile' 
            };
        }
    };

    const value = {
        user,
        isAuthenticated,
        loading,
        login,
        register,
        logout,
        updateUserProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
