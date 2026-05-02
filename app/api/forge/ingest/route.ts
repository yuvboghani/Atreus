import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { extractJson } from "@/lib/ai/selector";
import { logTokenUsage } from "@/lib/telemetry";

/**
 * Standalone Forge Ingestion API
 * Accepts raw job description text pasted by the user.
 * Extracts metadata via AI, saves to the jobs table,
 * returns the job ID for the Forge workspace.
 *
 * Resilient against:
 * - Missing organization_id (uses maybeSingle)
 * - Missing columns (full_description_markdown etc.)
 * - AI extraction failures (falls back to minimal data)
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

        // Resolve organization_id — use maybeSingle so it
        // doesn't throw on an empty jobs table
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
            // org_id is optional — continue without it
        }

        // Build a minimal, safe payload that only uses
        // columns guaranteed to exist in the live schema
        const jobPayload: Record<string, any> = {
            title: extracted.title || "Untitled Position",
            company: extracted.company || "Unknown Company",
            raw_description: text,
            status: "tailoring",
            url: `manual://${Date.now()}`,
            metadata: {
                ...extracted,
                raw_input_length: text.length,
                extraction_method: "glm-4.5-flash",
                source: "manual_paste",
            },
        };

        if (orgId) jobPayload.organization_id = orgId;

        // Try inserting — if a column error occurs,
        // retry with an even more minimal payload
        let insertData: any = null;
        let insertError: any = null;

        ({ data: insertData, error: insertError } = await supabase
            .from("jobs")
            .insert(jobPayload)
            .select("id")
            .single());

        if (insertError) {
            // If the error is about an unknown column,
            // strip metadata and retry
            if (insertError.message?.includes("column")) {
                console.warn(
                    "[FORGE] Column error, retrying with minimal payload:",
                    insertError.message
                );
                const minimal: Record<string, any> = {
                    title: jobPayload.title,
                    company: jobPayload.company,
                    raw_description: jobPayload.raw_description,
                    status: "tailoring",
                    url: jobPayload.url,
                };
                if (orgId) minimal.organization_id = orgId;

                ({ data: insertData, error: insertError } = await supabase
                    .from("jobs")
                    .insert(minimal)
                    .select("id")
                    .single());
            }
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
