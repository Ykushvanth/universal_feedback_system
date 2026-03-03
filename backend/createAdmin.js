/**
 * Create Admin User Script
 * Run this once to create the initial admin user
 */

require('dotenv').config();
const { supabase } = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
    try {
        console.log('Creating admin user...');

        const email = process.env.ADMIN_EMAIL || 'kushvanthyalamanchi2004@gmail.com';
        const password = process.env.ADMIN_PASSWORD || 'Admin@123';
        const name = process.env.ADMIN_NAME || 'System Administrator';

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (existingUser) {
            console.log('✅ Admin user already exists!');
            console.log('Email:', email);
            console.log('You can login with your credentials.');
            return;
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create admin user
        const { data, error } = await supabase
            .from('users')
            .insert([
                {
                    name: name,
                    email: email,
                    password_hash: passwordHash,
                    role: 'admin',
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            ])
            .select();

        if (error) {
            console.error('❌ Error creating admin user:', error);
            throw error;
        }

        console.log('✅ Admin user created successfully!');
        console.log('\n📧 Login Credentials:');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('\n⚠️  Please change the password after first login!');
        console.log('\n🚀 You can now login at: http://localhost:3000/login');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the script
createAdminUser();
