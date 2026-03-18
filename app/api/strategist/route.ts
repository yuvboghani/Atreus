import { NextRequest, NextResponse } from "next/server";
import { chatAgent } from "@/lib/ai/selector";
import { logTokenUsage } from "@/lib/telemetry";
import { createServerClient } from "@/utils/supabase/server";

const STRATEGIST_SYSTEM_PROMPT = `You are an expert Resume Strategist embedded in Project Atreus — an autonomous career operations system. The user will give you commands to modify their current LaTeX resume. You are precise, brutalist, and direct.

RULES:
1. First, give a BRIEF explanation of what you changed and why (2-3 sentences max).
2. Then, output the COMPLETE updated LaTeX document wrapped strictly in a markdown code block starting with \`\`\`latex and ending with \`\`\`.
3. NEVER output partial LaTeX. Always return the FULL document from \\documentclass to \\end{document}.
4. Keep all LaTeX syntax valid. Escape special characters properly (& → \\&, % → \\%, $ → \\$, # → \\#, _ → \\_).
5. Maintain the existing document structure unless the user explicitly asks you to restructure.
6. Be aggressive with improvements. Use the formula: "Verb + [What] + by [How] + achieving [Result]".
7. Use EXACT phrasing from the job description to mirror the employer's language.
8. BANNED WORDS: "Architected", "Spearheaded", "Synergized", "Revolutionized", "Passionate".`;

export async function POST(req: NextRequest) {
    try {
        const {
            prompt, currentLatex, chatHistory, jobId
        } = await req.json();

        if (!prompt || typeof prompt !== "string") {
            return NextResponse.json(
                { error: "Missing `prompt`." },
                { status: 400 }
            );
        }

        // Build messages
        const messages: {
            role: "system" | "user" | "assistant";
            content: string;
        }[] = [
            { role: "system", content: STRATEGIST_SYSTEM_PROMPT }
        ];

        // Fetch + inject full JD if jobId present
        if (jobId) {
            try {
                const supabase = await createServerClient();
                if (supabase) {
                    const { data: jobData } = await supabase
                        .from('jobs')
                        .select('full_description_markdown, raw_description, title, company')
                        .eq('id', jobId)
                        .single();

                    const jd = jobData?.full_description_markdown
                        || jobData?.raw_description || '';

                    if (jd) {
                        messages.push({
                            role: "system",
                            content: `TARGET JOB: ${jobData?.title} at ${jobData?.company}\n\nFULL JOB DESCRIPTION:\n${jd.substring(0, 6000)}\n\nUse this description to mirror the employer's exact language, keywords, and priorities in the resume.`,
                        });
                    }
                }
            } catch (err) {
                console.warn("[STRATEGIST] JD fetch failed:", err);
            }
        }

        // Inject current LaTeX
        if (currentLatex) {
            messages.push({
                role: "system",
                content: `CURRENT LATEX DOCUMENT:\n\`\`\`latex\n${currentLatex}\n\`\`\``,
            });
        }

        // Append chat history
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

        // Append current prompt
        messages.push({ role: "user", content: prompt });

        console.log("[STRATEGIST] Prompt:", prompt.substring(0, 80));
        console.log("[STRATEGIST] JobId:", jobId || 'none');
        console.log("[STRATEGIST] History:", chatHistory?.length || 0);

        const { content: response, usage } = await chatAgent(messages);

        logTokenUsage('[STRATEGIST]', usage, 'glm-4-plus');

        if (!response) {
            return NextResponse.json(
                { error: "AI returned empty response" },
                { status: 500 }
            );
        }

        return NextResponse.json({ response });
    } catch (err: any) {
        console.error("[STRATEGIST] Error:", err);
        return NextResponse.json(
            { error: "Strategist error", details: err.message },
            { status: 500 }
        );
    }
}
