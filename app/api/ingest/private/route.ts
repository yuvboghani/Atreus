import { createServerClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { extractJson } from "@/lib/ai/selector";
import { logTokenUsage } from "@/lib/telemetry";

export async function POST(req: Request) {
    try {
        const supabase = await createServerClient();
        if (!supabase) return NextResponse.json({ error: "Database Connection Failed" }, { status: 500 });

        // Service role key has no browser session — auth.getUser() returns null.
        // In single-owner mode, we skip the auth gate and use a fallback owner ID.
        let userId: string | null = null;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            userId = user?.id || null;
        } catch { /* no session, that's fine */ }

        const { text } = await req.json();

        // REAL AI EXTRACTION: GLM-4-Plus
        console.log("Igniting GLM-4-Plus for extraction...");
        let extracted: any = {};
        let usage: any = null;
        try {
            const result = await extractJson(text);
            extracted = result.data;
            usage = result.usage;

            // Log Telemetry
            logTokenUsage('[PRIVATE_INGEST]', usage, 'glm-4-plus');
        } catch (e) {
            console.error("Extraction failed, falling back to minimal:", e);
            extracted = { title: "Untitled (Extraction Failed)", company: "Unknown" };
        }

        console.log("Extraction complete:", extracted);

        // Resolve organization_id (required NOT NULL in live schema)
        let orgId: string | null = null;
        const { data: existingJob } = await supabase
            .from('jobs')
            .select('organization_id')
            .limit(1)
            .single();
        orgId = existingJob?.organization_id || null;

        const jobPayload: any = {
            title: extracted.title || "Untitled Position",
            company: extracted.company || "Unknown Company",
            raw_description: text,
            status: "tailoring",
            metadata: {
                ...extracted,
                raw_input_length: text.length,
                extraction_method: "glm-4-plus",
            }
        };

        if (orgId) jobPayload.organization_id = orgId;
        if (userId) jobPayload.created_by = userId;

        const { data, error } = await supabase
            .from('jobs')
            .insert(jobPayload)
            .select('id')
            .single();

        if (error) throw error;

        return NextResponse.json({ id: data.id });

    } catch (error: any) {
        console.error('Ingestion Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
