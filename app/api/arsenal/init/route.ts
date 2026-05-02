import { NextRequest, NextResponse } from "next/server";
import { chatAgent } from "@/lib/ai/selector";
import { logTokenUsage } from "@/lib/telemetry";

const INIT_SYSTEM_PROMPT = `You are an expert Career Operations AI. Your task is to process raw, messy resume text extracted from a PDF/DOCX and structure it into a clean, chronological Markdown document and extract a list of skills.

Return your response strictly as a JSON object with this exact schema:
{
  "resume_text": "The full formatted markdown of the resume (Work Experience, Education, Projects). Do NOT include a skills section here.",
  "skill_bank": ["React", "TypeScript", "System Architecture", ...]
}

RULES:
1. Fix any OCR or parsing errors.
2. Format experience chronologically with clear headers (e.g., ### Company Name - Role).
3. The skill_bank array should contain 15-30 core skills, tools, and methodologies mentioned or implied in the text.
4. Output ONLY valid JSON, no markdown code blocks outside the JSON values.`;

export async function POST(req: NextRequest) {
    try {
        const { rawText } = await req.json();
        
        if (!rawText) {
             return NextResponse.json({ error: "Missing rawText" }, { status: 400 });
        }

        const messages = [
            { role: "system" as const, content: INIT_SYSTEM_PROMPT },
            { role: "user" as const, content: `RAW TEXT:\n${rawText.substring(0, 15000)}` }
        ];

        const { content, usage } = await chatAgent(messages);
        logTokenUsage('[ARSENAL_INIT]', usage, 'glm-4-plus');

        // Parse JSON
        let parsed;
        try {
            // Strip potential markdown JSON codeblocks
            const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
            parsed = JSON.parse(cleaned);
        } catch (e) {
            console.error("[ARSENAL_INIT] Failed to parse JSON", content);
            return NextResponse.json({ error: "AI failed to return valid JSON" }, { status: 500 });
        }

        return NextResponse.json(parsed);

    } catch (error: any) {
        console.error("[ARSENAL_INIT] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
