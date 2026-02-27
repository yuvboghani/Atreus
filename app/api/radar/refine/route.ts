import { NextResponse } from 'next/server';
import { extractJson } from '@/lib/ai/selector';
import { createServerClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 10; // Enforce Hobby limit awareness

export async function GET(req: Request) {
    try {
        console.log("[ARCHITECT] Refinement Sequence Initialized.");

        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            console.error("[ARCHITECT] Unauthorized extraction attempt.");
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = await createServerClient();
        if (!supabase) {
            console.error("[DB ERROR] Database Connection Failed.");
            return NextResponse.json({ error: "Database Connection Failed" }, { status: 500 });
        }

        // 1. Fetch from Queue
        const { data: rawJobs, error: fetchError } = await supabase
            .from('jobs_raw')
            .select('*')
            .eq('is_processed', false)
            .order('created_at', { ascending: true })
            .limit(2);

        if (fetchError) {
            console.error("[DB ERROR] Failed to fetch from jobs_raw:", fetchError);
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        if (!rawJobs || rawJobs.length === 0) {
            console.log("[ARCHITECT] Queue is empty. Sleeping.");
            return NextResponse.json({ message: "Queue is empty", refined: 0 });
        }

        console.log(`[ARCHITECT] Fetched ${rawJobs.length} raw jobs from queue for refinement.`);

        // 2. AI Extraction
        const batchPrompt = `
        You are an elite job data extraction engine. I will provide a list of raw search results (snippets). 
        Return a JSON array of objects with these keys: title, company, url, location, salary_min, salary_max, tech_stack. 
        CRITICAL: Return ONLY the raw JSON array. Do not include markdown code blocks, explanations, or 'json' headers. If you cannot find a value, use null.
        
        RAW INPUT:
        ${JSON.stringify(
            rawJobs.map(job => ({ title: job.title, company: job.company, url: job.absolute_url, snippet: job.snippet })),
            null, 2
        )}
        `;

        console.log("[AI] Igniting intelligence layer for normalization...");
        const aiResponse = await extractJson(batchPrompt);

        let normalizedJobs: any[] = [];

        if (Array.isArray(aiResponse.data)) {
            normalizedJobs = aiResponse.data;
        } else if (aiResponse.data && Array.isArray(aiResponse.data.jobs)) {
            normalizedJobs = aiResponse.data.jobs;
        } else if (typeof aiResponse.data === 'string') {
            try {
                const sanitizedResponse = aiResponse.data.replace(/```json|```/g, '').trim();
                normalizedJobs = JSON.parse(sanitizedResponse);
            } catch (e) {
                console.error("[AI ERROR] Failed to parse stringified JSON", e);
            }
        } else if (aiResponse.data && aiResponse.data.title) {
            normalizedJobs = [aiResponse.data];
        } else {
            console.error("[AI ERROR] Unexpected JSON format returned:", aiResponse.data);
            return NextResponse.json({ error: 'AI Normalization failed to produce an array.' }, { status: 500 });
        }

        console.log(`[AI] Successfully extracted core data for ${normalizedJobs.length} jobs.`);

        // 3. Upsert to Main Jobs Database
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

        const { data: upsertResults, error: upsertError } = await supabase
            .from('jobs')
            .upsert(upsertData, { onConflict: 'absolute_url' })
            .select();

        if (upsertError) {
            console.error("[DB ERROR] Failed to upsert refined jobs:", upsertError);
            return NextResponse.json({ error: upsertError.message }, { status: 500 });
        }

        console.log(`[ARCHITECT] Refined Targets Secured: ${upsertResults?.length || 0} rows written to main database.`);

        // 4. Cleanup the Queue
        const jobIdsToDelete = rawJobs.map((job) => job.id);

        const { error: deleteError } = await supabase
            .from('jobs_raw')
            .delete()
            .in('id', jobIdsToDelete);

        if (deleteError) {
            // Ideally we wouldn't want to re-process these, but for now we'll just log
            console.error("[DB ERROR] Failed to delete processed rows from jobs_raw:", deleteError);
        } else {
            console.log(`[ARCHITECT] Janitor Purge: Removed ${jobIdsToDelete.length} processed items from queue.`);
        }

        return NextResponse.json({ success: true, refined: upsertResults?.length || 0 });

    } catch (error: any) {
        console.error("[ARCHITECT] CRITICAL_FAILURE: Engine crashed:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
