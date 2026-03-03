/**
 * Create Admin User Script
 * Run this script to create the initial admin user in the database
 * Usage: node scripts/createAdmin.js
 */

require('dotenv').config();
const UserModel = require('../src/models/User');
const { logger } = require('../src/utils/logger');

async function createAdmin() {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@klu.ac.in';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
        const adminName = process.env.ADMIN_NAME || 'System Administrator';

        console.log('Creating admin user...');
        console.log('Email:', adminEmail);

        // Check if admin already exists
        const existingAdmin = await UserModel.findByEmail(adminEmail);

        if (existingAdmin) {
            console.log('Admin user already exists!');
            console.log('Details:', {
                id: existingAdmin.id,
                email: existingAdmin.email,
                name: existingAdmin.name,
                role: existingAdmin.role
            });
            process.exit(0);
        }

        // Create new admin
        const admin = await UserModel.create({
            email: adminEmail,
            password: adminPassword,
            name: adminName,
            role: 'admin'
        });

        console.log('\n✓ Admin user created successfully!');
        console.log('Details:', {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role
        });
        console.log('\nYou can now login with:');
        console.log('Email:', adminEmail);
        console.log('Password:', adminPassword);
        console.log('\n⚠️  Please change the password after first login!');

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error);
        logger.error('Create admin script error:', error);
        process.exit(1);
    }
}

// Run the script
createAdmin();
