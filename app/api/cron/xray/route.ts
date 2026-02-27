import { NextResponse } from 'next/server';
import { fetchGoogleJobs } from '@/lib/ingestion/serp-scraper';
import { extractJson } from '@/lib/ai/selector';
import { createServerClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 10; // Enforce Hobby limit awareness

export async function GET(req: Request) {
    try {
        console.log("[INIT] X-Ray Route Triggered.");

        // 1. Protocol Checks
        if (!process.env.SERPER_API_KEY) {
            console.error("[ERROR] SERPER_API_KEY is missing.");
            return NextResponse.json({ error: "CONFIGURATION_REQUIRED" }, { status: 500 });
        }

        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            console.error("[ERROR] Unauthorized X-Ray access attempt.");
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Fetch Jobs (Limit to top 5 to save time)
        console.log("[X-RAY] Initiating Google SERP scan...");
        const jobs = await fetchGoogleJobs("Software Engineer OR Data Scientist");

        if (!jobs || jobs.length === 0) {
            console.log("[X-RAY] No jobs found in this sweep.");
            return NextResponse.json({ message: "No jobs found", imported: 0 });
        }

        const topJobs = jobs.slice(0, 5);
        console.log(`[X-RAY] Found ${jobs.length} total jobs. Processing top ${topJobs.length}.`);

        // 3. Batch AI Processing
        const batchPrompt = `
        Normalize the following list of raw job search results into a clean JSON array.
        Each object in the array MUST have this exact schema:
        {
            "title": "Normalized Job Title (e.g., Software Engineer)",
            "company": "Company Name",
            "url": "Application URL",
            "location": "City, State or Remote",
            "salary_min": number or null,
            "salary_max": number or null,
            "tech_stack": ["Skill1", "Skill2"]
        }
        Do NOT wrap the array in an object. Return ONLY the JSON [ ... ].
        
        RAW INPUT:
        ${JSON.stringify(topJobs, null, 2)}
        `;

        console.log("[AI] Normalizing batch...");
        // Use the faster glm-4-flash model if supported by selector, otherwise fallback to default
        const aiResponse = await extractJson(batchPrompt, "glm-4-flash");

        let normalizedJobs = [];
        if (Array.isArray(aiResponse.data)) {
            normalizedJobs = aiResponse.data;
        } else if (aiResponse.data && Array.isArray(aiResponse.data.jobs)) {
            normalizedJobs = aiResponse.data.jobs;
        } else {
            console.error("[AI ERROR] Unexpected JSON format returned:", aiResponse.data);
            // Attempt best-effort recovery if it's a single object
            if (aiResponse.data.title) {
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
            source: 'google_xray',
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

        console.log(`[DB] Upserted ${data?.length || 0} rows.`);

        return NextResponse.json({ success: true, imported: data?.length || 0 });

    } catch (error: any) {
        console.error("[FATAL ERROR] X-Ray Engine crashed:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
