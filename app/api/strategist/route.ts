import { NextRequest, NextResponse } from "next/server";
import { chatAgent } from "@/lib/ai/selector";
import { logTokenUsage } from "@/lib/telemetry";

const STRATEGIST_SYSTEM_PROMPT = `You are an expert Resume Strategist embedded in Project Atreus — an autonomous career operations system. The user will give you commands to modify their current LaTeX resume. You are precise, brutalist, and direct.

RULES:
1. First, give a BRIEF explanation of what you changed and why (2-3 sentences max).
2. Then, output the COMPLETE updated LaTeX document wrapped strictly in a markdown code block starting with \`\`\`latex and ending with \`\`\`.
3. NEVER output partial LaTeX. Always return the FULL document from \\documentclass to \\end{document}.
4. Keep all LaTeX syntax valid. Escape special characters properly (& → \\&, % → \\%, $ → \\$, # → \\#, _ → \\_).
5. Maintain the existing document structure unless the user explicitly asks you to restructure.
6. Be aggressive with improvements. Use the formula: "Verb + [What] + by [How] + achieving [Result]".
7. BANNED WORDS: "Architected", "Spearheaded", "Synergized", "Revolutionized", "Passionate".`;

export async function POST(req: NextRequest) {
    try {
        const { prompt, currentLatex, chatHistory } = await req.json();

        if (!prompt || typeof prompt !== "string") {
            return NextResponse.json(
                { error: "Missing or invalid `prompt` in request body." },
                { status: 400 }
            );
        }

        // Build the message history for the LLM
        const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
            {
                role: "system",
                content: STRATEGIST_SYSTEM_PROMPT,
            },
        ];

        // Inject current LaTeX as context
        if (currentLatex) {
            messages.push({
                role: "system",
                content: `CURRENT LATEX DOCUMENT:\n\`\`\`latex\n${currentLatex}\n\`\`\``,
            });
        }

        // Append prior chat history (if any)
        if (chatHistory && Array.isArray(chatHistory)) {
            for (const msg of chatHistory) {
                if (msg.role === "user" || msg.role === "assistant") {
                    messages.push({
                        role: msg.role,
                        content: msg.content,
                    });
                }
            }
        }

        // Append the current user prompt
        messages.push({
            role: "user",
            content: prompt,
        });

        console.log("[STRATEGIST] Prompt:", prompt.substring(0, 100));
        console.log("[STRATEGIST] History length:", chatHistory?.length || 0);
        console.log("[STRATEGIST] LaTeX length:", currentLatex?.length || 0);

        // Call GLM-4-Plus via the existing chatAgent
        const { content: response, usage } = await chatAgent(messages);

        // Telemetry logging
        logTokenUsage('[STRATEGIST]', usage, 'glm-4-plus');

        if (!response) {
            return NextResponse.json(
                { error: "AI returned empty response" },
                { status: 500 }
            );
        }

        console.log("[STRATEGIST] Response length:", response.length);

        return NextResponse.json({ response });
    } catch (err: any) {
        console.error("[STRATEGIST] Error:", err);
        return NextResponse.json(
            { error: "Strategist error", details: err.message || "Unknown error" },
            { status: 500 }
        );
    }
}
