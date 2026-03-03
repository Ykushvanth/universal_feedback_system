/**
 * Supabase Database Configuration
 */

const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../utils/logger');

// Validate environment variables
if (!process.env.SUPABASE_URL) {
    throw new Error('SUPABASE_URL environment variable is required');
}

if (!process.env.SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_ANON_KEY environment variable is required');
}

// Create Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    }
);

// Create admin client with service role (for admin operations)
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY 
    ? createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        }
    )
    : null;

/**
 * Test database connection
 */
async function testDatabaseConnection() {
    try {
        // Test simple query
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);

        if (error) {
            throw error;
        }

        logger.info('Supabase connection test successful');
        return true;
    } catch (error) {
        logger.error('Supabase connection test failed:', error.message);
        throw new Error(`Database connection failed: ${error.message}`);
    }
}

/**
 * Helper function to handle Supabase errors
 */
function handleSupabaseError(error) {
    if (error) {
        logger.error('Supabase error:', error);
        return {
            success: false,
            message: error.message || 'Database operation failed',
            code: error.code
        };
    }
    return null;
}

/**
 * Execute a database query with error handling
 */
async function executeQuery(queryFn) {
    try {
        const { data, error } = await queryFn();
        
        if (error) {
            throw error;
        }

        return { success: true, data };
    } catch (error) {
        logger.error('Query execution error:', error);
        return {
            success: false,
            message: error.message || 'Query execution failed',
            error
        };
    }
}

module.exports = {
    supabase,
    supabaseAdmin,
    testDatabaseConnection,
    handleSupabaseError,
    executeQuery
};
