import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';
import { fetchGoogleJobs } from '../lib/ingestion/serp-scraper';
import { fetchGreenhouse, fetchLever } from '../lib/ingestion/ats-fetcher';
import { shouldSkipJob } from '../lib/ingestion/filters';
import { extractStrongContext } from '../lib/ingestion/parser';

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

async function checkExists(
    url: string, supabase: any
): Promise<boolean> {
    const { data: jobMatch } = await supabase
        .from('jobs')
        .select('id')
        .eq('metadata->>url', url)
        .limit(1)
        .single();
    if (jobMatch) return true;

    const { data: rawMatch } = await supabase
        .from('jobs_raw')
        .select('absolute_url')
        .eq('absolute_url', url)
        .limit(1)
        .single();
    if (rawMatch) return true;

    return false;
}

async function main() {
    console.log("[SCOUT] Native Runner Initialized.");

    if (!process.env.SERPER_API_KEY) {
        console.error("[SCOUT] SERPER_API_KEY missing.");
        process.exit(1);
    }

    const supabase = getSupabase();

    // 1. Tier 1: Direct ATS APIs
    console.log("[SCOUT] Tier 1 (Sniper) sweeping...");
    const discordJobs = await fetchGreenhouse("discord");
    const stripeJobs = await fetchGreenhouse("stripe");
    const rubrikJobs = await fetchGreenhouse("rubrik");

    const tier1Jobs = [
        ...discordJobs, ...stripeJobs, ...rubrikJobs
    ].map(job => ({
        title: job.title,
        company: job.company,
        url: job.absolute_url,
        snippet: job.metadata?.team
            || "Direct ATS Ingestion",
        source_tier: 'Tier 1'
    }));

    // 2. Tier 2: Google SERP
    console.log("[SCOUT] Tier 2 (Net) sweeping...");
    const serpJobs = await fetchGoogleJobs(
        "Software Engineer OR Data Scientist"
    );
    const tier2Jobs = serpJobs
        ? serpJobs.map((job: any) => ({
            title: job.title,
            company: job.company || "Google SERP",
            url: job.url || job.link
                || `https://fallback.url/${encodeURIComponent(job.title || 'unknown')
                }-${encodeURIComponent(job.company || 'unknown')
                }`,
            snippet: job.snippet,
            source_tier: 'Tier 2'
        }))
        : [];

    const allJobs = [...tier1Jobs, ...tier2Jobs];
    console.log(`[SCOUT] Found ${allJobs.length} total.`);

    if (allJobs.length === 0) {
        console.log("[SCOUT] No jobs found. Exiting.");
        process.exit(0);
    }

    // 3. Firewall
    console.log("[SCOUT] Engaging High-Speed Firewall...");
    const filtered = allJobs.filter(
        j => !shouldSkipJob(j.title, j.snippet)
    );
    console.log(
        `[SCOUT] Firewall dropped ${allJobs.length - filtered.length
        } senior/lead roles.`
    );

    // 4. Deduplication
    console.log("[SCOUT] Deduplicating...");
    let newLeads: any[] = [];
    for (const job of filtered) {
        const exists = await checkExists(job.url, supabase);
        if (!exists) newLeads.push(job);
    }

    if (newLeads.length === 0) {
        console.log("[SCOUT] 0 novel leads. Exiting.");
        process.exit(0);
    }

    console.log(
        `[SCOUT] ${newLeads.length} novel leads. Queueing...`
    );

    // 5. Insert to jobs_raw
    const rawData = newLeads.map((job: any) => ({
        title: job.title,
        company: job.company,
        absolute_url: job.url,
        snippet: job.snippet,
        source_tier: job.source_tier || 'Tier 2',
        is_processed: false,
        regex_data: extractStrongContext(
            job.snippet, job.url
        )
    }));

    const { data, error } = await supabase
        .from('jobs_raw')
        .upsert(rawData, { onConflict: 'absolute_url' })
        .select();

    if (error) {
        console.error("[SCOUT] Upsert failed:", error);
        process.exit(1);
    }

    console.log(
        `[SCOUT] Complete: ${data?.length || 0} queued.`
    );
}

main().catch(err => {
    console.error("[SCOUT] FATAL:", err);
    process.exit(1);
});
