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

export async function POST(request: NextRequest) {
    try {
        const { job_id, message, user_id } = await request.json()
        let { org_id } = await request.json() // Allow it to be passed, but we'll fetch if missing

        if (!job_id || !message) {
            return NextResponse.json({ error: 'Missing required fields: job_id, message' }, { status: 400 })
        }

        const supabase = createServerClient()
        if (!supabase) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
        }

        // If org_id is missing, look it up from the job
        if (!org_id) {
            const { data: jobData, error: jobErr } = await supabase
                .from('jobs')
                .select('organization_id')
                .eq('id', job_id)
                .single()

            if (jobErr || !jobData) {
                return NextResponse.json({ error: 'Job not found or invalid' }, { status: 404 })
            }
            org_id = jobData.organization_id
        }

        // 1. Save User Message
        const { error: saveUserErr } = await supabase
            .from('chat_logs')
            .insert({
                job_id,
                organization_id: org_id,
                user_id: user_id || null, // Optional if not auth'd
                role: 'user',
                message
            })

        if (saveUserErr) {
            console.error('Failed to save user message', saveUserErr)
            return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
        }

        // 2. Fetch Context (Job + Resume)
        const { data: job } = await supabase
            .from('jobs')
            .select('title, raw_description')
            .eq('id', job_id)
            .single()

        const { data: resume } = await supabase
            .from('resumes')
            .select('content_tex')
            .eq('is_master', true)
            .eq('organization_id', org_id)
            .single()

        // 3. Fetch Chat History (Limit 10)
        const { data: history } = await supabase
            .from('chat_logs')
            .select('role, message')
            .eq('job_id', job_id)
            .order('created_at', { ascending: false }) // Get newest first
            .limit(10)

        // 4. Construct Prompt
        const jobTitle = job?.title || 'Unknown Job'
        const jobDesc = job?.raw_description?.substring(0, 800) || 'No description provided.'
        const resumeSnippet = resume?.content_tex?.substring(0, 1000) || 'No resume content.'

        const systemPrompt = `You are a career assistant helping the user analyze their fit for a job.
Job Title: ${jobTitle}
Job Description (snippet): ${jobDesc}...

Candidate Resume (snippet): ${resumeSnippet}...

Your Goal: Answer the user's questions based on this context. Be concise and helpful.`

        // Reverse history to be chronological (oldest -> newest)
        const pastMessages = (history || []).reverse().map(log => ({
            role: log.role as 'user' | 'assistant',
            content: log.message
        }));

        const messages = [
            { role: 'system', content: systemPrompt },
            ...pastMessages,
            { role: 'user', content: message }
        ] as any[]

        // 5. Call AI
        const glm = createGLMClient()
        const completion = await glm.chat.completions.create({
            model: 'glm-4.5',
            messages: messages,
            temperature: 0.7,
        })

        const assistantMessage = completion.choices[0]?.message?.content || 'I apologize, I could not generate a response.'

        // 6. Save Assistant Response
        const { error: saveAssistantErr } = await supabase
            .from('chat_logs')
            .insert({
                job_id,
                organization_id: org_id,
                user_id: user_id || null,
                role: 'assistant',
                message: assistantMessage
            })

        if (saveAssistantErr) {
            console.error('Failed to save assistant message', saveAssistantErr)
        }

        return NextResponse.json({ message: assistantMessage })

    } catch (error: any) {
        console.error('Chat API Error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
