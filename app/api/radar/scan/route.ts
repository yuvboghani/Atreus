import { NextResponse } from 'next/server';
import { fetchGoogleJobs } from '@/lib/ingestion/serp-scraper';
import { extractJson } from '@/lib/ai/selector';
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

        const topJobs = jobs.slice(0, 3);
        console.log(`[RADAR] Found ${jobs.length} total jobs. Processing top ${topJobs.length}.`);

        // 3. Batch AI Processing
        const batchPrompt = `
        You are a job data extraction engine. I will provide a list of search results. Return a JSON array of objects with these keys: title, company, url, location, salary_min, salary_max, tech_stack. 
        CRITICAL: Return ONLY the raw JSON array. Do not include markdown code blocks, explanations, or 'json' headers. If you cannot find a value, use null.
        
        RAW INPUT:
        ${JSON.stringify(topJobs, null, 2)}
        `;

        console.log("[AI] Normalizing batch...");
        let modelId = "glm-4-plus";
        console.log("[AI] Requesting model ID:", modelId);

        let aiResponse;
        try {
            aiResponse = await extractJson(batchPrompt, modelId);
        } catch (error) {
            console.warn(`[AI ERROR] Initial extraction failed with ${modelId}. Attempting fallback...`);
            modelId = "glm-4";
            console.log("[AI] Requesting model ID:", modelId);
            aiResponse = await extractJson(batchPrompt, modelId);
        }

        let normalizedJobs = [];

        // Step 2: Cleanup Regex already handled inside extractJson (lib/ai/selector.ts), but we add best-effort parsing here too.
        // However, extractJson returns a parsed object via JSON.parse().
        // If the AI failed to return valid JSON, extractJson throws or returns empty.
        // Assuming extractJson returned the parsed data successfully:
        if (Array.isArray(aiResponse.data)) {
            normalizedJobs = aiResponse.data;
        } else if (aiResponse.data && Array.isArray(aiResponse.data.jobs)) {
            normalizedJobs = aiResponse.data.jobs;
        } else if (typeof aiResponse.data === 'string') {
            // Fallback cleanup if the parser didn't catch the stringified array
            try {
                const sanitizedResponse = aiResponse.data.replace(/```json|```/g, '').trim();
                normalizedJobs = JSON.parse(sanitizedResponse);
            } catch (e) {
                console.error("[AI ERROR] Failed to parse sanitized string", e);
            }
        } else {
            console.error("[AI ERROR] Unexpected JSON format returned:", aiResponse.data);
            // Attempt best-effort recovery if it's a single object
            if (aiResponse.data && aiResponse.data.title) {
                normalizedJobs = [aiResponse.data];
            } else {
                return NextResponse.json({ error: 'AI Normalization failed to produce an array.' }, { status: 500 });
            }
        }

        console.log(`[AI] Successfully normalized ${normalizedJobs.length} jobs.`);

        // 4. Database Upsert
        const supabase = await createServerClient();
        if (!supabase) {
            console.error("[DB ERROR] Database Connection Failed.");
            return NextResponse.json({ error: "Database Connection Failed" }, { status: 500 });
        }

        const upsertData = normalizedJobs.map((job: any) => ({
            title: job.title,
            company: job.company,
            location: job.location || "Remote",
            absolute_url: job.url,
            source: 'radar_scan',
            status: 'draft',
            metadata: {
                tech_stack: job.tech_stack || [],
                salary_min: job.salary_min,
                salary_max: job.salary_max
            }
        }));

        const { data, error } = await supabase
            .from('jobs')
            .upsert(upsertData, { onConflict: 'absolute_url' })
            .select();

        if (error) {
            console.error("[DB ERROR] Upsert failed:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`[RADAR] Target Found: ${data?.length || 0} rows upserted.`);

        return NextResponse.json({ success: true, imported: data?.length || 0 });

    } catch (error: any) {
        console.error("[RADAR] SCAN_FAILED: Engine crashed:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
