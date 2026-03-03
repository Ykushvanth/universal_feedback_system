/**
 * Test Login Endpoint
 * Quick script to test if login is working
 */

const axios = require('axios');

async function testLogin() {
    try {
        console.log('Testing login endpoint...\n');

        const email = 'kushvanthyalamanchi2004@gmail.com';
        const password = 'Admin@123';

        console.log('Credentials:');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('\nSending request to: http://localhost:5000/api/auth/login');

        const response = await axios.post('http://localhost:5000/api/auth/login', {
            email: email,
            password: password
        });

        console.log('\n✅ Login successful!');
        console.log('\nResponse:');
        console.log('Success:', response.data.success);
        console.log('Message:', response.data.message);
        console.log('User:', response.data.data.user.name);
        console.log('Email:', response.data.data.user.email);
        console.log('Token exists:', !!response.data.data.token);

    } catch (error) {
        console.log('\n❌ Login failed!');
        
        if (error.response) {
            console.log('\nServer Response:');
            console.log('Status:', error.response.status);
            console.log('Message:', error.response.data.message || error.response.data);
        } else if (error.request) {
            console.log('\n❌ No response from server. Is the backend running?');
            console.log('Make sure the backend is running on http://localhost:5000');
        } else {
            console.log('\nError:', error.message);
        }
    }
}

// Run test
testLogin();
