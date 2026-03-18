import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';
import { refineJob } from '../lib/radar/engine';

const BATCH_SIZE = 20;
const INTER_JOB_DELAY = 3000;
const INTER_BATCH_DELAY = 5000;

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error("Missing SUPABASE env vars");
    }
    return createClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

async function main() {
    console.log("[REFINE] Native Runner V5 Initialized.");
    console.log("[REFINE] Deep Content Extraction: ON");

    const supabase = getSupabase();

    // Fetch user profile once
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)
        .single();

    const userProfile = {
        skill_bank: profile?.skill_bank || [],
        edu_level: profile?.edu_level || 2,
        current_yoe: profile?.current_yoe || 0
    };

    // Fetch ALL pending jobs
    const { data: rawJobs, error } = await supabase
        .from('jobs_raw')
        .select('*')
        .eq('is_processed', false)
        .order('created_at', { ascending: true });

    if (error) {
        console.error("[REFINE] Fetch failed:", error);
        process.exit(1);
    }

    if (!rawJobs || rawJobs.length === 0) {
        console.log("[REFINE] Queue empty. Exiting.");
        process.exit(0);
    }

    console.log(
        `[REFINE] ${rawJobs.length} jobs to process `
        + `(batches of ${BATCH_SIZE}).`
    );

    let success = 0;
    let failed = 0;
    let deepCount = 0;

    for (let i = 0; i < rawJobs.length; i += BATCH_SIZE) {
        const batch = rawJobs.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(
            rawJobs.length / BATCH_SIZE
        );

        console.log(
            `\n[REFINE] Batch ${batchNum}/${totalBatches}`
            + ` (${batch.length} jobs)`
        );

        for (const job of batch) {
            try {
                const result = await refineJob(
                    job, supabase, userProfile
                );
                if (result) {
                    success++;
                    if (result.scrape_status === 'full_content')
                        deepCount++;
                } else {
                    failed++;
                }
            } catch (err: any) {
                console.error(
                    `[REFINE] Error on ${job.title}:`,
                    err.message
                );
                failed++;
            }

            await new Promise(
                r => setTimeout(r, INTER_JOB_DELAY)
            );
        }

        if (i + BATCH_SIZE < rawJobs.length) {
            console.log("[REFINE] Batch cooldown (5s)...");
            await new Promise(
                r => setTimeout(r, INTER_BATCH_DELAY)
            );
        }
    }

    console.log(
        `\n[REFINE] Complete: `
        + `${success} refined, ${failed} failed. `
        + `${deepCount}/${success} deep-extracted.`
    );
}

main().catch(err => {
    console.error("[REFINE] FATAL:", err);
    process.exit(1);
});
