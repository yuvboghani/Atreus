require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrate() {
    // First, check what columns exist
    const { data: testRow, error: testErr } = await sb
        .from('profiles')
        .select('*')
        .limit(0);

    console.log('Current schema test:', testErr?.message || 'OK');

    // Try to add columns using Supabase Management API or SQL
    // Since we can't run raw SQL through client, we'll use the REST endpoint
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const sql = `
        ALTER TABLE public.profiles 
        ADD COLUMN IF NOT EXISTS resume_text text,
        ADD COLUMN IF NOT EXISTS skill_bank text[] DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
    `;

    // Execute via Supabase SQL endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`
        },
        body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
        console.log('RPC exec_sql not available, trying pg_query...');

        // Try the Supabase dashboard SQL API
        const pgResponse = await fetch(`${supabaseUrl}/pg`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`
            },
            body: JSON.stringify({ query: sql })
        });

        if (!pgResponse.ok) {
            console.log('pg endpoint also failed.');
            console.log('You need to run this SQL manually in the Supabase Dashboard:');
            console.log('');
            console.log(sql);
            console.log('');
            console.log('Go to: https://supabase.com/dashboard → SQL Editor → paste & run');
        } else {
            const pgData = await pgResponse.json();
            console.log('PG result:', pgData);
        }
    } else {
        const data = await response.json();
        console.log('Migration result:', data);
    }

    // Test if columns now exist
    const { error: verifyErr } = await sb
        .from('profiles')
        .upsert({
            id: '4e30e6de-c52f-4484-a94c-fc80747d8309',
            resume_text: 'Test resume',
            skill_bank: ['React', 'Node.js'],
            updated_at: new Date().toISOString()
        });

    if (verifyErr) {
        console.log('Verification FAILED:', verifyErr.message);
    } else {
        console.log('Verification PASSED: upsert succeeded!');

        // Read it back
        const { data: profile } = await sb
            .from('profiles')
            .select('*')
            .eq('id', '4e30e6de-c52f-4484-a94c-fc80747d8309')
            .single();
        console.log('Profile:', JSON.stringify(profile, null, 2));
    }
}

migrate().catch(console.error);
