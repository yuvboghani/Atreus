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

    // 3. Construct System Prompt (The Interviewer Protocol)
    // If resume bullets lack metrics/tools, ask questions.
    // We check context provided from client (e.g. current gaps).
    const systemPrompt = {
        role: 'system',
        content: `You are The Strategist, an elite career advisor for a 10x Engineer.
    CONTEXT:
    - Job: ${context.jobTitle} at ${context.company}
    - Gaps: ${context.gaps || "None detected"}
    
    PROTOCOL:
    1. Analyze the user's input and history.
    2. If the user's resume details are vague (missing numbers, specific tech), ACT AS AN INTERVIEWER. Ask 1-2 sharp, short questions to extract "Impact" and "Stack".
    3. Be brutal, concise, and direct. No fluff.
    4. Start responses with ">" terminal style.
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
