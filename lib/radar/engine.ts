import { orchestrator } from '../ai/orchestrator';
import { calculateMatchScore } from '../scoring';
import { scrapeJobPage } from '../utils/scraper';
import { createServerClient } from '../../utils/supabase/server';

/**
 * RADAR ENGINE V6 — Multi-Tenant
 *
 * 1. Scrape full HTML → Markdown
 * 2. AI Deep Extract (or snippet fallback)
 * 3. Insert job to jobs table (no score)
 * 4. Score per-user → user_job_matches
 * 5. Purge from queue
 */
export async function refineJob(
    rawJob: any,
    supabase?: any,
    users?: any[]
) {
    const db = supabase || await createServerClient();
    if (!db) throw new Error("DB connection failed");

    const regex = rawJob.regex_data || {};
    let aiDelta: any = {};
    let fullMarkdown: string | null = null;
    let scrapeStatus = 'partial_content';

    // 1. Deep Scrape
    if (rawJob.absolute_url) {
        fullMarkdown = await scrapeJobPage(
            rawJob.absolute_url
        );
    }

    // 2. AI Analysis
    if (fullMarkdown) {
        console.log(
            `[ENGINE] Deep mode: ${rawJob.title}`
        );
        const result = await orchestrator
            .deepExtract(fullMarkdown, regex);
        aiDelta = result.data || {};
        scrapeStatus = 'full_content';
    } else {
        console.log(
            `[ENGINE] Snippet fallback: ${rawJob.title}`
        );
        const result = await orchestrator
            .gapFillExtract([{
                id: rawJob.id,
                snippet: rawJob.snippet,
                regex_data: regex
            }]);
        aiDelta = result.data?.[0] || {};
    }

    // 3. Merge tech
    const mergedTech = Array.from(new Set([
        ...(regex.tech_stack || []),
        ...(aiDelta.tech_stack || [])
    ]));

    // 4. Build salary_range
    const salaryRange = aiDelta.salary_range
        || (aiDelta.salary_min && aiDelta.salary_max
            ? `$${aiDelta.salary_min}k-$${aiDelta.salary_max}k`
            : null);

    // 5. Insert to jobs (NO match_score)
    const { data: jobData, error } = await db
        .from('jobs')
        .upsert({
            title: rawJob.title,
            organization_id:
                'c1620ab4-b7a4-4000-a540-0b82fb8fde0b',
            company: rawJob.company,
            raw_description: rawJob.snippet || '',
            full_description_markdown:
                fullMarkdown || null,
            scrape_status: scrapeStatus,
            tech_stack: mergedTech,
            key_priorities:
                aiDelta.key_priorities || [],
            salary_range: salaryRange,
            remote_status:
                aiDelta.remote_status || 'unknown',
            metadata: {
                url: rawJob.absolute_url,
                source: 'radar_scan',
                location:
                    aiDelta.location || "Remote",
                salary_min:
                    aiDelta.salary_min || null,
                salary_max:
                    aiDelta.salary_max || null,
                yoe:
                    regex.yoe || aiDelta.yoe || null,
                req_edu: regex.education || null
            }
        }, { onConflict: 'id' })
        .select()
        .single();

    if (error) throw error;

    // 6. Per-user scoring
    const yoeNum = parseInt(regex.yoe || '0')
        || aiDelta.yoe || 0;
    const jobParsed = {
        tech_stack: mergedTech,
        min_yoe: yoeNum,
        req_edu: regex.education === 'MS' ? 3
            : regex.education === 'PhD' ? 4 : 2,
        is_entry_level: yoeNum <= 2
    };

    const activeUsers = users || [];
    for (const user of activeUsers) {
        const userProfile = {
            skill_bank: user.skill_bank || [],
            edu_level: user.edu_level || 2,
            current_yoe: user.current_yoe || 0
        };
        const score = calculateMatchScore(
            jobParsed, userProfile
        );

        // Build match analysis
        const overlaps = mergedTech.filter(
            (t: string) => userProfile.skill_bank
                .map((s: string) => s.toLowerCase())
                .includes(t.toLowerCase())
        );
        const analysis =
            `Match: ${overlaps.length}/${mergedTech.length} `
            + `tech overlap.`
            + (yoeNum > userProfile.current_yoe
                ? ` YoE gap: needs ${yoeNum}, has ${userProfile.current_yoe}.`
                : ` YoE: qualified.`);

        await db
            .from('user_job_matches')
            .upsert({
                user_id: user.id,
                job_id: jobData.id,
                match_score: score,
                match_analysis: analysis
            }, { onConflict: 'user_id,job_id' });
    }

    // 7. Purge from queue
    await db
        .from('jobs_raw')
        .delete()
        .eq('id', rawJob.id);

    console.log(
        `[ENGINE] ✅ ${jobData.title} | `
        + `${activeUsers.length} users scored `
        + `| ${scrapeStatus}`
    );
    return jobData;
}
