/**
 * Supabase client for direct frontend access.
 * Used exclusively for public student form loading and submission,
 * so requests never hit the Render backend (no cold-starts, no rate-limits).
 * All admin operations still go through the backend API.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnon = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnon) {
    console.error('Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY env vars');
}

const supabase = createClient(supabaseUrl, supabaseAnon, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});

export default supabase;
