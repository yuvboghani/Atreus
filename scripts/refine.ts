import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';
import { orchestrator } from '../lib/ai/orchestrator';
import { calculateMatchScore } from '../lib/scoring';

// Direct Supabase client (no Next.js dependency)
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

async function refineOne(rawJob: any, supabase: any, userProfile: any) {
    console.log(`[REFINE] Processing: ${rawJob.title} @ ${rawJob.company}`);

    // 1. AI Gap-Fill
    const batchPayload = [{
        id: rawJob.id,
        snippet: rawJob.snippet,
        regex_data: rawJob.regex_data || {}
    }];

    const aiResponse = await orchestrator
        .gapFillExtract(batchPayload);
    const aiDelta = aiResponse.data?.[0] || {};
    const regex = rawJob.regex_data || {};

    // 2. Merge
    const mergedTech = Array.from(new Set([
        ...(regex.tech_stack || []),
        ...(aiDelta.tech_stack || [])
    ]));

    // 3. Score
    const yoeNum = parseInt(regex.yoe || '0') || 0;
    const jobParsed = {
        tech_stack: mergedTech,
        min_yoe: yoeNum || aiDelta.yoe || 0,
        req_edu: regex.education === 'MS' ? 3
            : regex.education === 'PhD' ? 4 : 2,
        is_entry_level: yoeNum <= 2
            || (aiDelta.yoe && aiDelta.yoe <= 2)
    };
    const match_score = calculateMatchScore(
        jobParsed, userProfile
    );

    // 4. Insert to jobs
    const { data, error } = await supabase
        .from('jobs')
        .insert({
            title: rawJob.title,
            organization_id:
                'c1620ab4-b7a4-4000-a540-0b82fb8fde0b',
            company: rawJob.company,
            raw_description: rawJob.snippet,
            match_score,
            metadata: {
                url: rawJob.absolute_url,
                source: 'radar_scan',
                location: aiDelta.location || "Remote",
                tech_stack: mergedTech,
                salary_min: aiDelta.salary_min || null,
                salary_max: aiDelta.salary_max || null,
                yoe: regex.yoe || aiDelta.yoe || null,
                req_edu: regex.education || null
            }
        })
        .select()
        .single();

    if (error) {
        console.error(`[REFINE] Insert failed for ${rawJob.title}:`, error.message);
        return null;
    }

    // 5. Purge from queue
    await supabase
        .from('jobs_raw')
        .delete()
        .eq('id', rawJob.id);

    console.log(`[REFINE] Done: ${data.title} (${match_score}%)`);
    return data;
}

async function main() {
    console.log("[REFINE] Native Runner Initialized.");

    const supabase = getSupabase();

    // Fetch user profile for scoring
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
        `[REFINE] ${rawJobs.length} jobs to process.`
    );

    let success = 0;
    let failed = 0;

    for (const job of rawJobs) {
        try {
            const result = await refineOne(
                job, supabase, userProfile
            );
            if (result) success++;
            else failed++;
        } catch (err: any) {
            console.error(
                `[REFINE] Error on ${job.title}:`,
                err.message
            );
            failed++;
        }
        // Small delay to avoid API rate limits
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log(
        `[REFINE] Complete: ${success} refined, ${failed} failed.`
    );
}

main().catch(err => {
    console.error("[REFINE] FATAL:", err);
    process.exit(1);
});
