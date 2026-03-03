/**
 * User Model
 * Handles all user-related database operations
 */

const { supabase } = require('../config/database');
const bcrypt = require('bcryptjs');
const { logger } = require('../utils/logger');

class UserModel {
    /**
     * Find user by email
     */
    static async findByEmail(email) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data;
        } catch (error) {
            logger.error('Error finding user by email:', error);
            throw error;
        }
    }

    /**
     * Find user by ID
     */
    static async findById(id) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data;
        } catch (error) {
            logger.error('Error finding user by ID:', error);
            throw error;
        }
    }

    /**
     * Create new user
     */
    static async create(userData) {
        try {
            // Hash password
            const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
            const hashedPassword = await bcrypt.hash(userData.password, salt);

            const { data, error } = await supabase
                .from('users')
                .insert([{
                    email: userData.email,
                    password_hash: hashedPassword,
                    name: userData.name,
                    role: userData.role || 'admin',
                    is_active: true
                }])
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            logger.error('Error creating user:', error);
            throw error;
        }
    }

    /**
     * Update user
     */
    static async update(id, updates) {
        try {
            // If password is being updated, hash it
            if (updates.password) {
                const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
                updates.password_hash = await bcrypt.hash(updates.password, salt);
                delete updates.password;
            }

            const { data, error } = await supabase
                .from('users')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            logger.error('Error updating user:', error);
            throw error;
        }
    }

    /**
     * Update last login
     */
    static async updateLastLogin(id) {
        try {
            const { error } = await supabase
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', id);

            if (error) {
                throw error;
            }

            return true;
        } catch (error) {
            logger.error('Error updating last login:', error);
            return false;
        }
    }

    /**
     * Verify password
     */
    static async verifyPassword(plainPassword, hashedPassword) {
        try {
            return await bcrypt.compare(plainPassword, hashedPassword);
        } catch (error) {
            logger.error('Error verifying password:', error);
            return false;
        }
    }

    /**
     * Get all users (admin only)
     */
    static async getAll(filters = {}) {
        try {
            let query = supabase
                .from('users')
                .select('id, email, name, role, is_active, created_at, last_login');

            if (filters.role) {
                query = query.eq('role', filters.role);
            }

            if (filters.is_active !== undefined) {
                query = query.eq('is_active', filters.is_active);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            logger.error('Error getting all users:', error);
            throw error;
        }
    }

    /**
     * Delete user
     */
    static async delete(id) {
        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', id);

            if (error) {
                throw error;
            }

            return true;
        } catch (error) {
            logger.error('Error deleting user:', error);
            throw error;
        }
    }
}

module.exports = UserModel;
