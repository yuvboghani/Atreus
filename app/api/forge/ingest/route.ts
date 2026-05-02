import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { extractJson } from "@/lib/ai/selector";
import { logTokenUsage } from "@/lib/telemetry";

/**
 * Standalone Forge Ingestion API
 * Accepts a raw job description text pasted directly
 * by the user. Extracts metadata via AI, saves to
 * the jobs table, and returns the job ID for the
 * Forge workspace.
 */
export async function POST(req: Request) {
    try {
        const supabase = await createServerClient();
        if (!supabase) {
            return NextResponse.json(
                { error: "DB connection failed" },
                { status: 500 }
            );
        }

        const { text } = await req.json();

        if (!text || typeof text !== 'string') {
            return NextResponse.json(
                { error: "Missing job description text" },
                { status: 400 }
            );
        }

        // Extract structured metadata via AI
        console.log("[FORGE] Extracting from pasted JD...");
        let extracted: any = {};
        let usage: any = null;

        try {
            const result = await extractJson(text);
            extracted = result.data;
            usage = result.usage;
            logTokenUsage(
                '[FORGE_INGEST]', usage, 'glm-4-plus'
            );
        } catch (e) {
            console.error(
                "[FORGE] Extraction failed, using minimal:",
                e
            );
            extracted = {
                title: "Untitled Position",
                company: "Unknown Company"
            };
        }

        // Resolve organization_id if required
        let orgId: string | null = null;
        const { data: existingJob } = await supabase
            .from('jobs')
            .select('organization_id')
            .limit(1)
            .single();
        orgId = existingJob?.organization_id || null;

        const jobPayload: any = {
            title: extracted.title || "Untitled Position",
            company: extracted.company || "Unknown",
            raw_description: text,
            full_description_markdown: text,
            status: "tailoring",
            source: "manual_paste",
            url: `manual://${Date.now()}`,
            metadata: {
                ...extracted,
                raw_input_length: text.length,
                extraction_method: "glm-4-plus",
            }
        };

        if (orgId) jobPayload.organization_id = orgId;

        const { data, error } = await supabase
            .from('jobs')
            .insert(jobPayload)
            .select('id')
            .single();

        if (error) throw error;

        console.log(
            `[FORGE] Created job ${data.id}: `
            + `${extracted.title} @ ${extracted.company}`
        );

        return NextResponse.json({ id: data.id });

    } catch (error: any) {
        console.error("[FORGE] Ingestion error:", error);
        return NextResponse.json(
            { error: error.message || "Forge failed" },
            { status: 500 }
        );
    }
}
