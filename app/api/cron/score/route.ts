import { createServerClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// Helper for skill overlap
function calculateMatch(jobSkills: string[], userSkills: string[]): number {
    if (!jobSkills || jobSkills.length === 0) return 50; // Neutral if unknown
    const normalizedUser = userSkills.map(s => s.toLowerCase());
    const matches = jobSkills.filter(s => normalizedUser.includes(s.toLowerCase()));

    // Simple Percentage score
    // Bonus for high overlap
    const score = Math.round((matches.length / jobSkills.length) * 100);
    return Math.min(score, 100);
}

export async function GET(req: Request) {
    // SECURITY: Check CRON_SECRET if in production, or just allow for now in dev/MVP.
    // const authHeader = req.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) ...

    try {
        // 1. Get User Skills (Assuming single user for Atreus, or we iterate)
        // For multi-user, this cron would need to be per-user or batch process all.
        const supabase = await createServerClient();
        if (!supabase) return NextResponse.json({ error: "Database Connection Failed" }, { status: 500 });
        const { data: profiles } = await supabase.from('profiles').select('*').limit(1);
        if (!profiles || profiles.length === 0) return NextResponse.json({ message: "No profiles found" });
        const user = profiles[0];
        const userSkills = user.skill_bank || [];

        // 2. Get Unscored Jobs (or all jobs to refresh)
        // Let's do unscored or old ones. For now, just ones with match_score = 0
        const { data: jobs } = await supabase.from('jobs').select('*').eq('match_score', 0).limit(50);

        if (!jobs || jobs.length === 0) return NextResponse.json({ message: "No jobs to score" });

        const updates = [];
        for (const job of jobs) {
            const jobSkills = job.metadata?.tech_stack || [];
            // If no tech stack extracted, we might try to extract from description regex?
            // For now, rely on metadata.
            const score = calculateMatch(jobSkills, userSkills);

            updates.push({
                id: job.id,
                match_score: score
            });
        }

        // 3. Batch Update
        // Supabase doesn't have a clean "bulk update different values" in one query easily via JS SDK 
        // without RPC or multiple requests. We'll do parallel promises for now (limit 50).
        await Promise.all(updates.map(u =>
            supabase.from('jobs').update({ match_score: u.match_score }).eq('id', u.id)
        ));

        return NextResponse.json({ success: true, scores_updated: updates.length });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
