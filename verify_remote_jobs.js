const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

// Keys from .env
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkSchema() {
    console.log('Verifying DB Schema...');
    // Try to insert a dummy job with metadata to test column existence
    // Or just fetch one job and check keys
    const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error verifying schema:', error);
        return;
    }

    console.log('Schema check passed. Jobs table accessible.');
    if (data.length > 0) {
        const job = data[0];
        if ('metadata' in job) {
            console.log('✅ Metadata column confirmed.');
        } else {
            console.log('❌ Metadata column MISSING.');
        }
    } else {
        console.log('No jobs to verify column structure, but table exists.');
        // Try inserting a dummy job that should fail constraints or succeed
        // We'll skip insert to avoid pollution, just trust select worked means table exists.
    }
}

checkSchema();
