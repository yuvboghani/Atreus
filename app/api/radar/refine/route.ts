import { NextResponse } from 'next/server';
import { orchestrator } from '@/lib/ai/orchestrator';
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

        // 2. AI Extraction and Merge
        const batchPayload = rawJobs.map((job) => ({
            id: job.id,
            snippet: job.snippet,
            regex_data: job.regex_data || {}
        }));

        console.log("[AI] Igniting gap-fill intelligence layer...");
        const aiResponse = await orchestrator.gapFillExtract(batchPayload);

        let aiDeltas: any[] = [];
        if (Array.isArray(aiResponse.data)) {
            aiDeltas = aiResponse.data;
        } else {
            console.error("[AI ERROR] AI failed to produce an array.", aiResponse.data);
            return NextResponse.json({ error: 'AI Gap-Fill failed.' }, { status: 500 });
        }

        let regexCount = 0;
        let aiCount = 0;

        // 3. Upsert to Main Jobs Database
        const upsertData = rawJobs.map((rawJob, index) => {
            const aiDelta = aiDeltas[index] || {};
            const regex = rawJob.regex_data || {};

            const mergedTech = Array.from(new Set([...(regex.tech_stack || []), ...(aiDelta.tech_stack || [])]));

            if (regex.yoe) regexCount++;
            if (regex.salary) regexCount++;
            if (regex.education) regexCount++;
            if (regex.tech_stack && regex.tech_stack.length > 0) regexCount++;

            if (aiDelta.location) aiCount++;
            if (aiDelta.salary_min) aiCount++;
            if (aiDelta.tech_stack && aiDelta.tech_stack.length > 0) aiCount++;
            if (!regex.yoe && aiDelta.yoe) aiCount++;

            return {
                title: rawJob.title,
                organization_id: 'c1620ab4-b7a4-4000-a540-0b82fb8fde0b',
                company: rawJob.company,
                raw_description: rawJob.snippet,
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
            };
        });

        console.log(`[RADAR] Regex found ${regexCount}, AI filled ${aiCount}.`);

        const { data: upsertResults, error: upsertError } = await supabase
            .from('jobs')
            .insert(upsertData)
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
