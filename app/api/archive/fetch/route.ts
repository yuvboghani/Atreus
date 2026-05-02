import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { createAuthClient } from "@/utils/supabase/auth-server";

export async function GET() {
    try {
        const authClient = await createAuthClient();
        const { data: { user } } = await authClient.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const supabase = await createServerClient();
        if (!supabase) {
            return NextResponse.json(
                { error: "DB failed" },
                { status: 500 }
            );
        }

        // Fetch applications with their tailored
        // resumes and linked job data
        const { data: apps, error } = await supabase
            .from('applications')
            .select(`
                id,
                status,
                gap_analysis,
                created_at,
                updated_at,
                job:jobs(id, title, company, url),
                tailored_resume:resumes!tailored_resume_id(
                    id, content_tex, created_at
                )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("[ARCHIVE] Fetch error:", error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ applications: apps || [] });

    } catch (error: any) {
        console.error("[ARCHIVE] Error:", error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
