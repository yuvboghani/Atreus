const { createClient } = require('@supabase/supabase-js');

// Keys from .env.local
const SUPABASE_URL = 'https://yombhcnnlijonwfqwnur.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvbWJoY25ubGlqb253ZnF3bnVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYyNzUxOCwiZXhwIjoyMDg1MjAzNTE4fQ.hnhrKaiXP64GbTnUk4ZY3FS3lG12cuLgS0nUhXO9e4M';

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
