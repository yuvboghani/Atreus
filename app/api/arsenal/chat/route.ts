import { NextRequest, NextResponse } from "next/server";
import { chatAgent } from "@/lib/ai/selector";
import { logTokenUsage } from "@/lib/telemetry";

const CHAT_SYSTEM_PROMPT = `You are an expert Career Operations AI. The user is editing their Master Profile.
You will be provided with their CURRENT 'resume_text' (Markdown) and 'skill_bank' (JSON array), along with their chat message (e.g., "Add my experience at Google using React").

You must update the resume_text and/or skill_bank to reflect their request, and provide a brief conversational reply.

Return your response strictly as a JSON object with this exact schema:
{
  "updated_resume_text": "The fully updated markdown document.",
  "updated_skill_bank": ["React", "TypeScript", ...],
  "ai_reply": "Got it! I added your Google experience and added React to your skill bank."
}

RULES:
1. ONLY return valid JSON. Do not wrap it in markdown code blocks.
2. Ensure the updated_resume_text remains cleanly formatted in Markdown.
3. If the user asks a question without requesting changes, return the original text/skills unchanged, and answer in ai_reply.
4. Keep the ai_reply concise and encouraging.`;

export async function POST(req: NextRequest) {
    try {
        const { prompt, currentResumeText, currentSkillBank, chatHistory } = await req.json();
        
        if (!prompt) {
             return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
        }

        const messages: { role: "system" | "user" | "assistant", content: string }[] = [
            { role: "system" as const, content: CHAT_SYSTEM_PROMPT }
        ];

        if (chatHistory && Array.isArray(chatHistory)) {
            for (const msg of chatHistory) {
                 if (msg.role === "user" || msg.role === "assistant") {
                     messages.push({ role: msg.role, content: msg.content });
                 }
            }
        }

        const userContext = `CURRENT RESUME TEXT:\n${currentResumeText}\n\nCURRENT SKILL BANK:\n${JSON.stringify(currentSkillBank)}\n\nUSER REQUEST:\n${prompt}`;
        messages.push({ role: "user" as const, content: userContext });

        const { content, usage } = await chatAgent(messages);
        logTokenUsage('[ARSENAL_CHAT]', usage, 'glm-4-plus');

        let parsed;
        try {
            const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
            parsed = JSON.parse(cleaned);
        } catch (e) {
            console.error("[ARSENAL_CHAT] Failed to parse JSON", content);
            return NextResponse.json({ error: "AI failed to return valid JSON" }, { status: 500 });
        }

        return NextResponse.json(parsed);

    } catch (error: any) {
        console.error("[ARSENAL_CHAT] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
