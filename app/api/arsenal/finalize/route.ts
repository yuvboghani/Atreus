import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { createAuthClient } from "@/utils/supabase/auth-server";

/**
 * Arsenal Finalize API
 * Runs server-side with the service role key so it
 * bypasses RLS entirely. Upserts resume_text and
 * skill_bank into the profiles table for the
 * authenticated user, then marks onboarding complete
 * if the column exists.
 */
export async function POST(req: NextRequest) {
    try {
        // Authenticate the calling user
        const authClient = await createAuthClient();
        const { data: { user }, error: authError } = await authClient.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { resume_text, skill_bank } = await req.json();

        if (!resume_text) {
            return NextResponse.json(
                { error: "Missing resume_text" },
                { status: 400 }
            );
        }

        // Service role client — bypasses RLS
        const supabase = createServerClient();
        if (!supabase) {
            return NextResponse.json(
                { error: "Database connection failed" },
                { status: 500 }
            );
        }

        // Build the payload — try with onboarding_completed
        const payload: Record<string, any> = {
            id: user.id,
            resume_text,
            skill_bank: skill_bank || [],
            updated_at: new Date().toISOString(),
        };

        // Check if column exists before including it
        const { data: colCheck } = await supabase
            .from("profiles")
            .select("onboarding_completed")
            .eq("id", user.id)
            .maybeSingle();

        // If query didn't throw a "column not found" error,
        // the column exists — include it
        if (colCheck !== undefined) {
            payload.onboarding_completed = true;
        }

        const { error } = await supabase
            .from("profiles")
            .upsert(payload, { onConflict: "id" });

        if (error) {
            // Last-resort fallback: try without onboarding_completed
            if (error.message?.includes("onboarding_completed")) {
                delete payload.onboarding_completed;
                const retry = await supabase
                    .from("profiles")
                    .upsert(payload, { onConflict: "id" });
                if (retry.error) throw retry.error;
            } else {
                throw error;
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("[ARSENAL_FINALIZE] Error:", error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
