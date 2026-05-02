import { NextRequest, NextResponse } from "next/server";
import { chatAgent } from "@/lib/ai/selector";
import { logTokenUsage } from "@/lib/telemetry";

const INIT_SYSTEM_PROMPT = `You are an expert Career Operations AI. Your task is to process raw, messy resume text extracted from a PDF/DOCX and structure it into a clean, highly structured Markdown document and extract a list of skills.

Return your response strictly as a JSON object with this exact schema:
{
  "resume_text": "The full formatted markdown of the resume. MUST follow the EXACT structure below.",
  "skill_bank": ["Languages|Python", "Languages|Java", "ML and Data|PyTorch", "Frameworks and Libraries|React", "Relevant Coursework|Algorithms", "Other|Git"]
}

resume_text MUST BE FORMATTED EXACTLY LIKE THIS (include only sections that have data):
## Experiences
### Company Name - Role (Date)
- Bullet point 1
- Bullet point 2

## Research
### Institution Name - Role (Date)
- Bullet point 1

## Publications
- Title, Venue, Date, Link

## Projects
### Project Name (Date)
- Bullet point 1
- Bullet point 2

RULES:
1. Fix any OCR or parsing errors.
2. Format chronologically with clear headers and bullet points.
3. The skill_bank array MUST categorize every skill by prepending the category and a pipe character (e.g., "Category|Skill").
4. Valid categories for skill_bank: Languages, ML and Data, Frameworks and Libraries, Relevant Coursework, Other.
5. Output ONLY valid JSON.`;

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

        let parsed;
        try {
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
