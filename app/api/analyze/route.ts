import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerClient } from '@/utils/supabase/server'

// Initialize OpenAI client for Z.ai (GLM)
function createGLMClient() {
    const apiKey = process.env.ZAI_API_KEY
    if (!apiKey) {
        throw new Error('ZAI_API_KEY is not configured')
    }
    return new OpenAI({
        apiKey,
        baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    })
}

const GAP_ANALYSIS_SYSTEM_PROMPT = `You are a career coach expert in "Gap Analysis". 
Your Goal: Analyze the gap between a candidate's resume and a job description.

TASK:
1. Compare the qualifications, skills, and experience in the Resume vs the Job Description.
2. Identify missing keywords, skills, or experience (Gaps).
3. For each gap, propose a "1-Week Project" the candidate could build to demonstrate that skill.

OUTPUT JSON FORMAT ONLY:
{
  "gaps": [
    {
      "skill": "Missing Skill Name",
      "project_name": "Catchy Project Title",
      "project_description": "Brief 1-sentence description of what to build."
    },
    ...
  ],
  "summary": "Brief summary of fit..."
}`

export async function POST(request: NextRequest) {
    try {
        const { job_id } = await request.json()

        if (!job_id) {
            return NextResponse.json({ error: 'Missing job_id' }, { status: 400 })
        }

        const supabase = createServerClient()
        if (!supabase) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
        }

        // 1. Fetch Job and Master Resume
        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .select('raw_description, id')
            .eq('id', job_id)
            .single()

        if (jobError || !job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 })
        }

        // Get the organization_id from the job (to find the right resume)
        // Actually, resumes are per-org, so we need the org_id from the user's profile or context. 
        // But jobs are also per-org. We can assume we want the master resume for the same org as the job.
        // Let's fetch the Org ID from the job first if needed, but RLS might handle visibility.
        // However, RLS requires authentication. The server client bypasses RLS? 
        // The server client in utils/supabase/server.ts uses the service role key, so IT BYPASSES RLS.
        // We must be careful. Ideally we get the current user's org.

        // Ensure we are fetching the *master* resume for the *same organization* as the job.
        // Fetch organization_id from the job to be sure.
        const { data: jobWithOrg } = await supabase.from('jobs').select('organization_id').eq('id', job_id).single();
        const org_id = jobWithOrg?.organization_id;

        if (!org_id) {
            return NextResponse.json({ error: 'Invalid Job Data' }, { status: 500 })
        }

        const { data: resume, error: resumeError } = await supabase
            .from('resumes')
            .select('content_tex')
            .eq('is_master', true)
            .eq('organization_id', org_id)
            .single()

        if (resumeError || !resume) {
            return NextResponse.json({ error: 'Master resume not found for this organization' }, { status: 404 })
        }

        // 2. Call AI
        const glm = createGLMClient()
        const userContent = `Resume:\n${resume.content_tex}\n\nJob:\n${job.raw_description}`

        const completion = await glm.chat.completions.create({
            model: 'glm-4.5',
            messages: [
                { role: 'system', content: GAP_ANALYSIS_SYSTEM_PROMPT },
                { role: 'user', content: userContent },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' }, // GLM-4 supports JSON mode? If not, we parse.
        })

        const rawContent = completion.choices[0]?.message?.content || '{}'

        // Robust JSON parsing
        let analysis = { gaps: [], summary: 'Analysis failed' }
        try {
            const cleaned = rawContent
                .replace(/^```(?:json)?\s*\n?/i, '')
                .replace(/\n?```\s*$/i, '')
                .trim()
            analysis = JSON.parse(cleaned)
        } catch (e) {
            console.error('JSON Parse Error', e)
            analysis = { gaps: [], summary: rawContent.substring(0, 500) } // Fallback
        }

        // 3. Save to DB (Update Job)
        const { error: updateError } = await supabase
            .from('jobs')
            .update({ gap_analysis: analysis })
            .eq('id', job_id)

        if (updateError) {
            return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 })
        }

        return NextResponse.json({ success: true, analysis })

    } catch (error: any) {
        console.error('Gap Analysis Error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
