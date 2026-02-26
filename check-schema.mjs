import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Fetching job schema...');
    const { data: jobs, error } = await supabase
        .from('jobs')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching jobs:', error);
    } else if (jobs && jobs.length > 0) {
        console.log('Columns in jobs table:');
        console.log(Object.keys(jobs[0]));
    } else {
        console.log('Jobs table is empty.');
    }
}

checkSchema();
