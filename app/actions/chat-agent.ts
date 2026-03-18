'use server';

import { createServerClient } from "@/utils/supabase/server";
import { chatAgent } from "@/lib/ai/selector";

export async function sendChatMessage(applicationId: string, userMessage: string, context: any) {
    const supabase = await createServerClient();
    if (!supabase) throw new Error("Supabase client failed");
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // 1. Fetch existing history
    const { data: app } = await supabase
        .from('applications')
        .select('chat_history')
        .eq('id', applicationId)
        .single();

    let history = (app?.chat_history as any[]) || [];

    // 2. Append User Message
    history.push({ role: 'user', content: userMessage });

    // 3. Fetch full JD context for precise tailoring
    let fullJD = '';
    if (context.jobId) {
        const { data: jobData } = await supabase
            .from('jobs')
            .select('full_description_markdown, raw_description')
            .eq('id', context.jobId)
            .single();
        fullJD = jobData?.full_description_markdown
            || jobData?.raw_description || '';
    }

    // 4. Construct System Prompt (The Interviewer Protocol)
    const systemPrompt = {
        role: 'system',
        content: `You are The Strategist, an elite career advisor for a 10x Engineer.
    CONTEXT:
    - Job: ${context.jobTitle} at ${context.company}
    - Gaps: ${context.gaps || "None detected"}
    ${fullJD ? `\nFULL JOB DESCRIPTION:\n${fullJD.substring(0, 6000)}` : ''}
    
    PROTOCOL:
    1. Analyze the user's input and history.
    2. If the user's resume details are vague (missing numbers, specific tech), ACT AS AN INTERVIEWER. Ask 1-2 sharp, short questions to extract "Impact" and "Stack".
    3. Use EXACT phrasing from the job description to suggest resume bullet rewrites.
    4. Be brutal, concise, and direct. No fluff.
    5. Start responses with ">" terminal style.
    `
    };

    // 4. Call AI
    // We send [System, ...History]
    const aiResponseContent = await chatAgent([systemPrompt, ...history]);

    // 5. Append AI Response
    history.push({ role: 'assistant', content: aiResponseContent });

    // 6. Save back to DB
    await supabase
        .from('applications')
        .update({ chat_history: history })
        .eq('id', applicationId);

    return {
        message: aiResponseContent,
        history: history
    };
}
