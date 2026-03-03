/**
 * Check User in Database
 * Verify if user exists and password hash is correct
 */

require('dotenv').config();
const { supabase } = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function checkUser() {
    try {
        console.log('Checking user in database...\n');

        const email = 'kushvanthyalamanchi2004@gmail.com';
        const password = 'Admin@123';

        // Find user
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            console.log('❌ User not found in database!');
            console.log('Error:', error?.message || 'No user with this email');
            console.log('\nCreating user now...\n');
            
            // Create user
            const passwordHash = await bcrypt.hash(password, 10);
            
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert([
                    {
                        name: 'System Administrator',
                        email: email,
                        password_hash: passwordHash,
                        role: 'admin',
                        is_active: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                ])
                .select()
                .single();

            if (createError) {
                console.log('❌ Error creating user:', createError.message);
                return;
            }

            console.log('✅ User created successfully!');
            console.log('\nLogin Credentials:');
            console.log('Email:', email);
            console.log('Password:', password);
            return;
        }

        console.log('✅ User found in database!');
        console.log('\nUser Details:');
        console.log('ID:', user.id);
        console.log('Name:', user.name);
        console.log('Email:', user.email);
        console.log('Role:', user.role);
        console.log('Is Active:', user.is_active);
        console.log('Password Hash exists:', !!user.password_hash);

        // Test password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        console.log('\nPassword Test:');
        console.log('Testing password:', password);
        console.log('Password matches:', isMatch);

        if (!isMatch) {
            console.log('\n⚠️  Password does not match! Resetting password...\n');
            
            // Reset password
            const newPasswordHash = await bcrypt.hash(password, 10);
            
            const { error: updateError } = await supabase
                .from('users')
                .update({ password_hash: newPasswordHash, updated_at: new Date().toISOString() })
                .eq('id', user.id);

            if (updateError) {
                console.log('❌ Error updating password:', updateError.message);
                return;
            }

            console.log('✅ Password reset successfully!');
            console.log('\nYou can now login with:');
            console.log('Email:', email);
            console.log('Password:', password);
        } else {
            console.log('\n✅ Everything looks good! You should be able to login with:');
            console.log('Email:', email);
            console.log('Password:', password);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run check
checkUser();
