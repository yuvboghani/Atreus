import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { extractJson } from "@/lib/ai/selector";
import { logTokenUsage } from "@/lib/telemetry";

/**
 * Standalone Forge Ingestion API
 * 
 * Resilient against missing columns — only writes to columns
 * that exist in the core schema (id, title, company, metadata).
 * Extra columns (url, raw_description, status, source) go into
 * the metadata JSONB until the migration is applied.
 */
export async function POST(req: Request) {
    try {
        const supabase = createServerClient();
        if (!supabase) {
            return NextResponse.json(
                { error: "DB connection failed — check env vars" },
                { status: 500 }
            );
        }

        const body = await req.json();
        const text: string = body?.text;

        if (!text || typeof text !== "string" || !text.trim()) {
            return NextResponse.json(
                { error: "Missing or empty job description" },
                { status: 400 }
            );
        }

        // Extract structured metadata via AI (best-effort)
        let extracted: Record<string, any> = {};
        try {
            const result = await extractJson(text);
            extracted = result.data ?? {};
            logTokenUsage("[FORGE_INGEST]", result.usage, "glm-4.5-flash");
        } catch (e) {
            console.warn("[FORGE] AI extraction failed, using defaults:", e);
            extracted = {
                title: "Untitled Position",
                company: "Unknown Company",
            };
        }

        // Resolve organization_id — maybeSingle so it never
        // throws on an empty jobs table
        let orgId: string | null = null;
        try {
            const { data: sample } = await supabase
                .from("jobs")
                .select("organization_id")
                .not("organization_id", "is", null)
                .limit(1)
                .maybeSingle();
            orgId = sample?.organization_id ?? null;
        } catch {
            // optional — continue without it
        }

        const manualUrl = `manual://${Date.now()}`;

        // Core payload — only guaranteed columns from the original schema
        // Everything else is stored in metadata JSONB
        const jobPayload: Record<string, any> = {
            title: extracted.title || "Untitled Position",
            company: extracted.company || "Unknown Company",
            metadata: {
                ...extracted,
                source: "manual_paste",
                manual_url: manualUrl,
                raw_description: text,
                raw_input_length: text.length,
                extraction_method: "glm-4.5-flash",
            },
        };

        if (orgId) jobPayload.organization_id = orgId;

        // First attempt — try with extra optional columns
        // that exist after running migration 014
        const fullPayload = {
            ...jobPayload,
            raw_description: text,
            status: "tailoring",
            source: "manual_paste",
            url: manualUrl,
        };

        let insertData: any = null;
        let insertError: any = null;

        ({ data: insertData, error: insertError } = await supabase
            .from("jobs")
            .insert(fullPayload)
            .select("id")
            .single());

        // If a column doesn't exist yet, fall back to core-only payload
        if (insertError?.message?.includes("column")) {
            console.warn(
                "[FORGE] Column error on full payload, retrying with core only:",
                insertError.message
            );

            ({ data: insertData, error: insertError } = await supabase
                .from("jobs")
                .insert(jobPayload)
                .select("id")
                .single());
        }

        // Last resort — absolute minimum
        if (insertError?.message?.includes("column")) {
            console.warn("[FORGE] Retrying with absolute minimum payload");
            const bare: Record<string, any> = {
                title: jobPayload.title,
                company: jobPayload.company,
            };
            if (orgId) bare.organization_id = orgId;

            ({ data: insertData, error: insertError } = await supabase
                .from("jobs")
                .insert(bare)
                .select("id")
                .single());
        }

        if (insertError) throw insertError;
        if (!insertData?.id) throw new Error("Insert returned no ID");

        console.log(
            `[FORGE] Created job ${insertData.id}: ` +
            `${jobPayload.title} @ ${jobPayload.company}`
        );

        return NextResponse.json({ id: insertData.id });

    } catch (error: any) {
        console.error("[FORGE] Ingestion error:", error);
        return NextResponse.json(
            { error: error.message || "Forge ingestion failed" },
            { status: 500 }
        );
    }
}
