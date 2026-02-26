import { createServerClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { calculateMatchScore } from "@/lib/scoring";

export async function GET(req: Request) {
    try {
        const supabase = await createServerClient();
        if (!supabase) return NextResponse.json({ error: "Database Connection Failed" }, { status: 500 });

        // 1. Get User Profile
        const { data: profiles } = await supabase.from('profiles').select('skill_bank, edu_level, current_yoe').limit(1);
        if (!profiles || profiles.length === 0) return NextResponse.json({ message: "No profiles found" });

        const userProfile = {
            skill_bank: profiles[0].skill_bank || [],
            edu_level: profiles[0].edu_level ?? 2,
            current_yoe: profiles[0].current_yoe ?? 0,
        };

        // 2. Get Unscored Jobs (match_score = 0)
        const { data: jobs } = await supabase.from('jobs').select('*').eq('match_score', 0).limit(50);
        if (!jobs || jobs.length === 0) return NextResponse.json({ message: "No jobs to score" });

        // 3. Score each job using the Intelligent Matching Engine
        const updates = jobs.map(job => {
            const jobParsed = {
                tech_stack: job.metadata?.tech_stack || [],
                min_yoe: Number(job.metadata?.min_yoe) || 0,
                req_edu: Number(job.metadata?.req_edu) || 2,
                is_entry_level: Boolean(job.metadata?.is_entry_level),
            };

            return {
                id: job.id,
                match_score: calculateMatchScore(jobParsed, userProfile),
            };
        });

        // 4. Batch Update
        await Promise.all(updates.map(u =>
            supabase.from('jobs').update({ match_score: u.match_score }).eq('id', u.id)
        ));

        return NextResponse.json({ success: true, scores_updated: updates.length });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
