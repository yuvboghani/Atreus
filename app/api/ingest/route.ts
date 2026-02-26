import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { calculateMatchScore } from '@/lib/scoring';
import { logTokenUsage } from '@/lib/telemetry';

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        // 1. Call ZhipuAI (GLM-4-Flash) to parse the text
        const zhipuApiKey = process.env.ZAI_API_KEY;
        if (!zhipuApiKey) {
            console.error('ZAI_API_KEY is missing');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const model = 'glm-4-plus';

        // ZhipuAI OpenAI-compatible endpoint — ENHANCED SCHEMA
        const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${zhipuApiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: 'system',
                        content: `You are a strict JSON parser. You extract structured data from job descriptions.
Output ONLY a valid JSON object with the following keys:
- title (string): The job title
- company (string): The company name
- salary (string | null): The salary range or null if not found
- tech_stack (array of strings): List of technologies/skills mentioned. Normalize to industry standards (e.g., 'React.js' -> 'React', 'NodeJS' -> 'Node', 'PostgreSQL' -> 'Postgres').
- min_yoe (number): The absolute minimum years of experience required. Default to 0 if not explicitly stated.
- req_edu (number): The minimum education required. Use this scale: 1 = High School, 2 = Bachelor's, 3 = Master's, 4 = PhD. Default to 2 if not stated.
- is_entry_level (boolean): Set to true ONLY IF the job explicitly mentions "New Grad", "Entry Level", "University Hiring", "Early Career", "Junior", OR if the minimum YoE is 0, 1, or 2.

Do not include any markdown formatting (like \`\`\`json). Just the raw JSON object.`
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ],
                temperature: 0.1
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ZhipuAI API Error:', errorText);
            return NextResponse.json({ error: 'Failed to process text with AI' }, { status: 500 });
        }

        const data = await response.json();

        // Log Telemetry (non-blocking)
        logTokenUsage('[INGESTION]', data.usage, model);

        const content = data.choices[0]?.message?.content;

        if (!content) {
            return NextResponse.json({ error: 'AI returned empty response' }, { status: 500 });
        }

        // Clean up potential markdown code blocks if the model ignores instruction
        const jsonString = content.replace(/```json\n?|\n?```/g, '').trim();

        let parsedData;
        try {
            parsedData = JSON.parse(jsonString);
        } catch (e) {
            console.error('Failed to parse AI response as JSON:', content);
            return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 500 });
        }

        const {
            title,
            company,
            salary,
            tech_stack,
            min_yoe = 0,
            req_edu = 2,
            is_entry_level = false
        } = parsedData;

        if (!title || !company) {
            return NextResponse.json({ error: 'AI failed to extract title or company' }, { status: 422 });
        }

        // 2. Initialize Supabase (Service Role)
        const supabase = createServerClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Database client initialization failed' }, { status: 500 });
        }

        // 3. Fetch organization ID
        const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('id')
            .limit(1)
            .single();

        if (orgError || !orgData) {
            console.error('Failed to find organization:', orgError);
            return NextResponse.json({ error: 'No organization found to assign job to' }, { status: 500 });
        }

        // 4. Fetch user profile for scoring (single-user mode — first profile)
        let matchScore = 0;
        try {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('skill_bank, edu_level, current_yoe')
                .limit(1);

            if (profiles && profiles.length > 0) {
                const userProfile = {
                    skill_bank: profiles[0].skill_bank || [],
                    edu_level: profiles[0].edu_level ?? 2,
                    current_yoe: profiles[0].current_yoe ?? 0,
                };

                const jobParsed = {
                    tech_stack: tech_stack || [],
                    min_yoe: Number(min_yoe) || 0,
                    req_edu: Number(req_edu) || 2,
                    is_entry_level: Boolean(is_entry_level),
                };

                matchScore = calculateMatchScore(jobParsed, userProfile);
                console.log(`[SCORING] ${title} @ ${company} → ${matchScore}/100`);
            }
        } catch (scoreErr) {
            console.error('[SCORING] Failed to calculate match score:', scoreErr);
            // Non-fatal — continue with score 0
        }

        const metadataPayload = {
            salary,
            tech_stack,
            min_yoe: Number(min_yoe) || 0,
            req_edu: Number(req_edu) || 2,
            is_entry_level: Boolean(is_entry_level),
            match_score: matchScore, // Always store in metadata as fallback
        };

        const basePayload = {
            company,
            title,
            raw_description: text,
            organization_id: orgData.id,
            metadata: metadataPayload,
        };

        // Manual upsert to bypass missing UNIQUE constraints in Postgres
        let job: any = null;
        let dbError: any = null;

        // 1. Check if job exists
        const { data: existingJob, error: selectError } = await supabase
            .from('jobs')
            .select('id')
            .eq('company', company)
            .eq('title', title)
            .maybeSingle();

        if (selectError) {
            console.error('Supabase Select Error:', selectError);
            return NextResponse.json({ error: 'Database error finding job' }, { status: 500 });
        }

        // Try to include match_score if column exists, otherwise fallback to metadata only
        // We will just attempt the update/insert with match_score. If it fails, fallback.
        const attemptDbOp = async (payload: any) => {
            if (existingJob) {
                return await supabase.from('jobs').update(payload).eq('id', existingJob.id).select('id').single();
            } else {
                return await supabase.from('jobs').insert(payload).select('id').single();
            }
        };

        let result = await attemptDbOp({ ...basePayload, match_score: matchScore });

        if (result.error?.message?.includes('match_score')) {
            console.log('[INGEST] match_score column not found, saving to metadata only');
            result = await attemptDbOp(basePayload);
        }

        if (result.error) {
            console.error('Supabase Upsert Error:', result.error);
            return NextResponse.json({ error: 'Failed to save job to database' }, { status: 500 });
        }

        job = result.data;


        return NextResponse.json({ id: job.id, parsed: parsedData, match_score: matchScore });

    } catch (error: any) {
        console.error('Ingestion Error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error.message || 'Unknown error',
            stack: error.stack
        }, { status: 500 });
    }
}
