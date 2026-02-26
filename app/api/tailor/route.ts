import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerClient } from '@/utils/supabase/server'

// z.ai GLM client — the ONLY LLM provider
function createGLMClient() {
    const apiKey = process.env.ZAI_API_KEY
    if (!apiKey) {
        throw new Error('ZAI_API_KEY is not configured. Set it in your environment variables.')
    }
    return new OpenAI({
        apiKey,
        baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    })
}

const DENSE_COMPACT_SYSTEM_PROMPT = `You are an expert Resume Engineer specializing in the "Dense-Compact" LaTeX style.
Your Goal: Rewrite the user's resume content to match the provided Job Description (JD).

STRICT CONSTRAINTS:
1. **Formatting:** Use \\documentclass[11pt]{article} with 0.5in margins. Use \\setlist{nosep} to kill whitespace.
2. **The 240-Char Rule:** Rewrite every experience bullet point to be between **230 and 240 characters**. Each bullet MUST fill exactly two lines in the compiled PDF. Detail is mandatory.
3. **ATS keywords:** Scan the JD. If the JD uses specific terms (e.g., "CI/CD pipeline" vs "automation"), swap the user's terms to match the JD exactly.
4. **Skills Bank:** If the user provided a "Skills Bank," pull relevant tech from there to fill gaps.

OUTPUT: Return ONLY the raw LaTeX code. No markdown formatting. No code fences. No explanation.`

const KEYWORD_ANALYSIS_PROMPT = `You are a keyword analysis engine. Given a Job Description (JD) and a Tailored Resume (LaTeX), extract keyword data.

TASK:
1. Extract all technical keywords, tools, frameworks, methodologies, and role-specific terms from the JD.
2. Check which of those keywords appear (verbatim or semantically equivalent) in the Tailored Resume.
3. Identify any term swaps you detect (where the resume uses a JD-specific term instead of a generic one).

OUTPUT FORMAT: Return ONLY valid JSON, no markdown, no code fences:
{
  "jd_keywords": ["keyword1", "keyword2", ...],
  "used_keywords": ["keyword1", ...],
  "missing_keywords": ["keyword2", ...],
  "swapped_terms": [{"original": "user's original term", "replaced_with": "JD term"}]
}`

export async function POST(request: NextRequest) {
    try {
        const {
            job_description,
            current_latex_code,
            skills_bank_text,
            job_req_id,
        } = await request.json()

        if (!job_description || !current_latex_code) {
            return NextResponse.json(
                { error: 'Missing required fields: job_description, current_latex_code' },
                { status: 400 }
            )
        }

        const glm = createGLMClient()

        // --- Step 1: Tailor the resume ---
        const userContent = `INPUT DATA:
- Job Description: ${job_description}
- Master Resume: ${current_latex_code}
- Skills Bank: ${skills_bank_text || 'Not provided'}`

        const tailorResponse = await glm.chat.completions.create({
            model: 'glm-4.5',
            messages: [
                { role: 'system', content: DENSE_COMPACT_SYSTEM_PROMPT },
                { role: 'user', content: userContent },
            ],
            temperature: 0.3,
        })

        const rawTailored = tailorResponse.choices[0]?.message?.content || ''

        // Strip any accidental markdown code fences
        const tailoredLatex = rawTailored
            .replace(/^```(?:latex|tex)?\s*\n?/i, '')
            .replace(/\n?```\s*$/i, '')
            .trim()

        // --- Step 2: Keyword analysis ---
        const keywordResponse = await glm.chat.completions.create({
            model: 'glm-4.5',
            messages: [
                { role: 'system', content: KEYWORD_ANALYSIS_PROMPT },
                {
                    role: 'user',
                    content: `Job Description:\n${job_description}\n\nTailored Resume:\n${tailoredLatex}`,
                },
            ],
            temperature: 0.1,
        })

        const rawKeywords = keywordResponse.choices[0]?.message?.content || '{}'

        let keywordAnalysis = {
            jd_keywords: [] as string[],
            used_keywords: [] as string[],
            missing_keywords: [] as string[],
            swapped_terms: [] as Array<{ original: string; replaced_with: string }>,
        }

        try {
            const cleaned = rawKeywords
                .replace(/^```(?:json)?\s*\n?/i, '')
                .replace(/\n?```\s*$/i, '')
                .trim()
            keywordAnalysis = JSON.parse(cleaned)
        } catch {
            console.error('Failed to parse keyword analysis JSON:', rawKeywords)
        }

        // --- Step 3: Persist to Supabase (if configured) ---
        let savedId: string | null = null
        const supabase = createServerClient()

        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('resumes')
                    .insert({
                        job_req_id: job_req_id || null,
                        content_tex: tailoredLatex,
                        is_master: false,
                        keyword_analysis: keywordAnalysis,
                        // job_id and organization_id left null for MVP standalone mode
                    })
                    .select('id')
                    .single()

                if (error) {
                    console.error('Supabase insert error:', error.message)
                } else {
                    savedId = data?.id || null
                }
            } catch (dbErr) {
                console.error('Database persistence failed (non-blocking):', dbErr)
            }
        } else {
            console.log('Supabase not configured — skipping database persistence')
        }

        return NextResponse.json({
            tailored_latex: tailoredLatex,
            keyword_analysis: keywordAnalysis,
            saved_id: savedId,
            persisted: !!savedId,
        })
    } catch (error: unknown) {
        console.error('Tailor API error:', error)
        const message = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
