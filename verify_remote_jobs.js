const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

// Keys from .env
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkJobs() {
    console.log('Checking remote jobs table...');
    const { data, error } = await supabase
        .from('jobs')
        .select('title, company, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching jobs:', error);
        return;
    }

    if (data.length === 0) {
        console.log('No jobs found.');
    } else {
        console.log('Found recent jobs:');
        data.forEach(job => {
            console.log(`- ${job.title} at ${job.company} (${new Date(job.created_at).toLocaleString()})`);
        });
    }
}

checkJobs();
