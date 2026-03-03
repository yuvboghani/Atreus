import { orchestrator } from '../ai/orchestrator';
import { calculateMatchScore } from '../scoring';
import { createServerClient } from '../../utils/supabase/server';

/**
 * RADAR ENGINE — Heavy Lifter
 * 
 * Processes exactly ONE job from jobs_raw:
 * 1. AI Gap-Fill via GLM-4.5-Flash
 * 2. Merge regex_data + AI delta
 * 3. Calculate match_score
 * 4. Insert to jobs table
 * 5. Delete from jobs_raw
 */
export async function refineJob(rawJob: any) {
    const supabase = await createServerClient();
    if (!supabase) throw new Error("DB connection failed");

    // 1. Fetch user profile for scoring
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)
        .single();

    const userProfile = {
        skill_bank: profile?.skill_bank || [],
        edu_level: profile?.edu_level || 2,
        current_yoe: profile?.current_yoe || 0
    };

    // 2. AI Gap-Fill (single job)
    console.log(`[ENGINE] Refining: ${rawJob.title}`);
    const batchPayload = [{
        id: rawJob.id,
        snippet: rawJob.snippet,
        regex_data: rawJob.regex_data || {}
    }];

    const aiResponse = await orchestrator
        .gapFillExtract(batchPayload);
    const aiDelta = aiResponse.data?.[0] || {};
    const regex = rawJob.regex_data || {};

    // 3. Merge
    const mergedTech = Array.from(new Set([
        ...(regex.tech_stack || []),
        ...(aiDelta.tech_stack || [])
    ]));

    // 4. Score
    const yoeNum = parseInt(regex.yoe || '0') || 0;
    const jobParsed = {
        tech_stack: mergedTech,
        min_yoe: yoeNum || aiDelta.yoe || 0,
        req_edu: regex.education === 'MS' ? 3
            : regex.education === 'PhD' ? 4 : 2,
        is_entry_level: yoeNum <= 2
            || (aiDelta.yoe && aiDelta.yoe <= 2)
    };
    const match_score = calculateMatchScore(
        jobParsed, userProfile
    );

    // 5. Insert to jobs
    const { data, error } = await supabase
        .from('jobs')
        .insert({
            title: rawJob.title,
            organization_id:
                'c1620ab4-b7a4-4000-a540-0b82fb8fde0b',
            company: rawJob.company,
            raw_description: rawJob.snippet,
            match_score,
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
        })
        .select()
        .single();

    if (error) throw error;

    // 6. Purge from queue
    await supabase
        .from('jobs_raw')
        .delete()
        .eq('id', rawJob.id);

    console.log(`[ENGINE] Done: ${data.title} (${match_score}%)`);
    return data;
}
