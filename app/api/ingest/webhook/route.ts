import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { checkExists } from '@/lib/ingestion/db-ops';
import { extractStrongContext } from '@/lib/ingestion/parser';

export async function POST(req: Request) {
    try {
        console.log("[MERCENARY] External Ingestion Webhook Triggered.");

        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            console.error("[MERCENARY] Unauthorized payload rejected.");
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        // Expecting either an array of jobs or a single job object wrapped in a field
        let rawPayloads = [];
        if (Array.isArray(body)) {
            rawPayloads = body;
        } else if (body && Array.isArray(body.jobs)) {
            rawPayloads = body.jobs;
        } else if (body && body.title && body.url) {
            rawPayloads = [body];
        }

        if (rawPayloads.length === 0) {
            console.warn("[MERCENARY] No valid job objects found in payload.");
            return NextResponse.json({ error: "Invalid Payload Structure" }, { status: 400 });
        }

        const supabase = await createServerClient();
        if (!supabase) {
            console.error("[DB ERROR] Database Connection Failed.");
            return NextResponse.json({ error: "Database Connection Failed" }, { status: 500 });
        }

        console.log(`[MERCENARY] Processing ${rawPayloads.length} incoming targets...`);
        let newLeads = [];

        for (const job of rawPayloads) {
            if (!job.url) continue; // URL is strictly required for the firewall

            const exists = await checkExists(job.url, supabase);
            if (!exists) {
                newLeads.push({
                    title: job.title || "Unknown Title",
                    company: job.company || "Unknown Company",
                    absolute_url: job.url,
                    snippet: job.snippet || "External Webhook Data",
                    source_tier: 'Tier 3',
                    is_processed: false,
                    regex_data: extractStrongContext(job.snippet || "External Webhook Data", job.url)
                });
            }
        }

        if (newLeads.length === 0) {
            console.log("[MERCENARY] Sweep yielded 0 novel leads after deduplication.");
            return NextResponse.json({ success: true, queued: 0, message: "All targets were duplicates." });
        }

        console.log(`[MERCENARY] Firewall passed ${newLeads.length} novel targets. Queueing...`);

        const { data, error } = await supabase
            .from('jobs_raw')
            .upsert(newLeads, { onConflict: 'absolute_url' })
            .select();

        if (error) {
            console.error("[DB ERROR] Mercenary Queue Upsert failed:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`[MERCENARY] Extraction Complete: ${data?.length || 0} external jobs queued for Architect.`);
        return NextResponse.json({ success: true, queued: data?.length || 0 });

    } catch (error: any) {
        console.error("[MERCENARY] CRITICAL_FAILURE:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
