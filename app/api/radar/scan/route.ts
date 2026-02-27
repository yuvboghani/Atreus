import { NextResponse } from 'next/server';
import { fetchGoogleJobs } from '@/lib/ingestion/serp-scraper';
import { createServerClient } from '@/utils/supabase/server';

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

        // 2. Fetch Jobs (Limit to top 5 to save time)
        console.log("[RADAR] Initiating Google SERP scan...");
        const jobs = await fetchGoogleJobs("Software Engineer OR Data Scientist");

        if (!jobs || jobs.length === 0) {
            console.log("[RADAR] No jobs found in this sweep.");
            return NextResponse.json({ message: "No jobs found", imported: 0 });
        }

        // 3. Database Upsert to jobs_raw queue (No AI)
        const supabase = await createServerClient();
        if (!supabase) {
            console.error("[DB ERROR] Database Connection Failed.");
            return NextResponse.json({ error: "Database Connection Failed" }, { status: 500 });
        }

        const rawUpsertData = jobs.map((job: any) => ({
            title: job.title,
            company: job.company,
            absolute_url: job.url,
            snippet: job.snippet,
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
