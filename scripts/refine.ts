import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';
import { orchestrator } from '../lib/ai/orchestrator';
import { calculateMatchScore } from '../lib/scoring';
import { scrapeJobPage } from '../lib/utils/scraper';

const BATCH_SIZE = 20;
const INTER_JOB_DELAY = 3000;   // 3s between jobs
const INTER_BATCH_DELAY = 5000; // 5s between batches

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

async function refineOne(
    rawJob: any,
    supabase: any,
    userProfile: any
) {
    console.log(
        `[REFINE] Processing: ${rawJob.title} @ ${rawJob.company}`
    );

    const regex = rawJob.regex_data || {};
    let aiDelta: any = {};
    let fullMarkdown: string | null = null;
    let contentQuality = 'partial';

    // 1. Attempt Deep Scrape
    if (rawJob.absolute_url) {
        fullMarkdown = await scrapeJobPage(
            rawJob.absolute_url
        );
    }

    // 2. AI Analysis (deep or fallback)
    if (fullMarkdown) {
        console.log("[REFINE] Deep extraction mode.");
        const deepResult = await orchestrator
            .deepExtract(fullMarkdown, regex);
        aiDelta = deepResult.data || {};
        contentQuality = 'full';
    } else {
        console.log("[REFINE] Snippet fallback mode.");
        const batchPayload = [{
            id: rawJob.id,
            snippet: rawJob.snippet,
            regex_data: regex
        }];
        const gapResult = await orchestrator
            .gapFillExtract(batchPayload);
        aiDelta = gapResult.data?.[0] || {};
    }

    // 3. Merge tech stacks
    const mergedTech = Array.from(new Set([
        ...(regex.tech_stack || []),
        ...(aiDelta.tech_stack || [])
    ]));

    // 4. Score
    const yoeNum = parseInt(regex.yoe || '0')
        || aiDelta.yoe || 0;
    const jobParsed = {
        tech_stack: mergedTech,
        min_yoe: yoeNum,
        req_edu: regex.education === 'MS' ? 3
            : regex.education === 'PhD' ? 4 : 2,
        is_entry_level: yoeNum <= 2
    };
    const match_score = calculateMatchScore(
        jobParsed, userProfile
    );

    // 5. Insert to jobs
    const description = fullMarkdown
        || rawJob.snippet || '';

    const { data, error } = await supabase
        .from('jobs')
        .insert({
            title: rawJob.title,
            organization_id:
                'c1620ab4-b7a4-4000-a540-0b82fb8fde0b',
            company: rawJob.company,
            raw_description: description,
            match_score,
            metadata: {
                url: rawJob.absolute_url,
                source: 'radar_scan',
                content_quality: contentQuality,
                location: aiDelta.location || "Remote",
                remote_status: aiDelta.remote_status
                    || "unknown",
                tech_stack: mergedTech,
                salary_min: aiDelta.salary_min || null,
                salary_max: aiDelta.salary_max || null,
                yoe: regex.yoe || aiDelta.yoe || null,
                req_edu: regex.education || null,
                key_priorities: aiDelta.key_priorities
                    || null
            }
        })
        .select()
        .single();

    if (error) {
        console.error(
            `[REFINE] Insert failed for ${rawJob.title}:`,
            error.message
        );
        return null;
    }

    // 6. Purge from queue
    await supabase
        .from('jobs_raw')
        .delete()
        .eq('id', rawJob.id);

    console.log(
        `[REFINE] ✅ ${data.title} | ${match_score}% | ${contentQuality}`
    );
    return data;
}

async function main() {
    console.log("[REFINE] Native Runner Initialized.");
    console.log("[REFINE] Deep Content Extraction: ON");

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
        `[REFINE] ${rawJobs.length} jobs to process `
        + `(batches of ${BATCH_SIZE}).`
    );

    let success = 0;
    let failed = 0;
    let fullContent = 0;

    // Process in batches
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
                const result = await refineOne(
                    job, supabase, userProfile
                );
                if (result) {
                    success++;
                    if (result.metadata?.content_quality
                        === 'full') fullContent++;
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
            // 3s delay between jobs
            await new Promise(
                r => setTimeout(r, INTER_JOB_DELAY)
            );
        }

        // 5s pause between batches
        if (i + BATCH_SIZE < rawJobs.length) {
            console.log(
                "[REFINE] Batch cooldown (5s)..."
            );
            await new Promise(
                r => setTimeout(r, INTER_BATCH_DELAY)
            );
        }
    }

    console.log(
        `\n[REFINE] Complete: `
        + `${success} refined, ${failed} failed. `
        + `${fullContent}/${success} deep-extracted.`
    );
}

main().catch(err => {
    console.error("[REFINE] FATAL:", err);
    process.exit(1);
});
