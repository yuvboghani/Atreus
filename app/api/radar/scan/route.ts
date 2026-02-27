import { NextResponse } from 'next/server';
// Triggering Next.js HMR Cache Clear
import { fetchGoogleJobs } from '@/lib/ingestion/serp-scraper';
import { fetchGreenhouse, fetchLever } from '@/lib/ingestion/ats-fetcher';
import { createServerClient } from '@/utils/supabase/server';
import { checkExists } from '@/lib/ingestion/db-ops';

export const dynamic = 'force-dynamic';
export const maxDuration = 10; // Enforce Hobby limit awareness

export async function GET(req: Request) {
    try {
        console.log("[RADAR] Network Sweep Initialized.");

        // 1. Protocol Checks
        if (!process.env.SERPER_API_KEY) {
            console.error("[ERROR] SERPER_API_KEY is missing.");
            return NextResponse.json({ error: "CONFIGURATION_REQUIRED" }, { status: 500 });
        }

        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            console.error("[RADAR] Unauthorized scanner access attempt.");
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2a. Fetch Tier 1 Jobs (The Sniper - Direct APIs)
        console.log("[RADAR] Initiating Tier 1 (Sniper) ATS Sweeps...");
        const discordJobs = await fetchGreenhouse("discord");
        const stripeJobs = await fetchGreenhouse("stripe");
        const rubrikJobs = await fetchGreenhouse("rubrik"); // Assuming Greenhouse for now, adjust if Lever
        // const otherJobs = await fetchLever("company");

        const tier1Jobs = [...discordJobs, ...stripeJobs, ...rubrikJobs].map(job => ({
            title: job.title,
            company: job.company,
            url: job.absolute_url,
            snippet: job.metadata?.team || "Direct ATS Ingestion",
            source_tier: 'Tier 1'
        }));

        // 2b. Fetch Tier 2 Jobs (The Net - Google Dorks)
        console.log("[RADAR] Initiating Tier 2 (Net) Google SERP scan...");
        const serpJobs = await fetchGoogleJobs("Software Engineer OR Data Scientist");
        const tier2Jobs = serpJobs ? serpJobs.map((job: any) => ({
            title: job.title,
            company: job.company || "Google SERP",
            url: job.url || job.link || `https://fallback.url/${encodeURIComponent(job.title || 'unknown')}-${encodeURIComponent(job.company || 'unknown')}`,
            snippet: job.snippet,
            source_tier: 'Tier 2'
        })) : [];

        const allJobs = [...tier1Jobs, ...tier2Jobs];

        if (!allJobs || allJobs.length === 0) {
            console.log("[RADAR] No jobs found in this omni-sweep.");
            return NextResponse.json({ message: "No jobs found", imported: 0 });
        }

        // 3. The Token Sentry: Deduplicate the leads
        const supabase = await createServerClient();
        if (!supabase) {
            console.error("[DB ERROR] Database Connection Failed.");
            return NextResponse.json({ error: "Database Connection Failed" }, { status: 500 });
        }

        console.log("[RADAR] Deduping raw signal...");

        let newLeads: any[] = [];

        // Execute in parallel batches to prevent 10s timeout
        const CHUNK_SIZE = 50;
        for (let i = 0; i < allJobs.length; i += CHUNK_SIZE) {
            const chunk = allJobs.slice(i, i + CHUNK_SIZE);
            const existenceResults = await Promise.all(
                chunk.map(async (job) => {
                    const exists = await checkExists((job as any).url, supabase);
                    return { job, exists };
                })
            );

            newLeads.push(...existenceResults.filter(r => !r.exists).map(r => r.job));
        }

        if (newLeads.length === 0) {
            console.log("[RADAR] Omni-Scout sweep yielded 0 novel leads.");
            return NextResponse.json({ success: true, queued: 0, message: "No new leads found" });
        }

        console.log(`[RADAR] Firewall passed ${newLeads.length} novel targets. Queueing...`);

        // 4. Database Upsert to jobs_raw queue
        const rawUpsertData = newLeads.map((job: any) => ({
            title: job.title,
            company: job.company,
            absolute_url: job.url,
            snippet: job.snippet,
            source_tier: job.source_tier || 'Tier 2',
            is_processed: false
        }));

        const { data, error } = await supabase
            .from('jobs_raw')
            .upsert(rawUpsertData, { onConflict: 'absolute_url' })
            .select();

        if (error) {
            console.error("[DB ERROR] Scout Queue Upsert failed:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`[RADAR] Scout Sweep Complete: ${data?.length || 0} raw jobs queued for Architect.`);
        return NextResponse.json({ success: true, queued: data?.length || 0 });

    } catch (error: any) {
        console.error("[RADAR] SCOUT_FAILED: Engine crashed:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
