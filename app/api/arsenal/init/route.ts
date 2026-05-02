import { NextRequest } from "next/server";
import OpenAI from "openai";

/**
 * Edge Runtime — no 10s timeout on Vercel Hobby.
 * Streams the AI response as NDJSON lines back to the
 * client so the connection stays alive during generation.
 */
export const runtime = "edge";

const INIT_SYSTEM_PROMPT = `You are an expert Career Operations AI.
Process raw resume text and return a SINGLE valid JSON object.
No markdown code blocks. No explanation. Only JSON.

Schema:
{
  "resume_text": "Structured markdown of the resume",
  "skill_bank": ["Languages|Python", "ML and Data|PyTorch"]
}

resume_text format (include only sections that have data):
## Experiences
### Company - Role (Date)
- Bullet point

## Research
### Institution - Role (Date)
- Bullet point

## Publications
- Title, Venue, Date

## Projects
### Project Name (Date)
- Bullet point

RULES:
1. Fix OCR/parsing errors.
2. Format chronologically.
3. skill_bank: prefix each skill with its category and | separator.
4. Valid categories: Languages, ML and Data, Frameworks and Libraries, Relevant Coursework, Other.
5. Output ONLY the raw JSON object. Nothing else.`;

export async function POST(req: NextRequest) {
    const { rawText } = await req.json();

    if (!rawText) {
        return new Response(
            JSON.stringify({ error: "Missing rawText" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    const openai = new OpenAI({
        apiKey: process.env.ZAI_API_KEY,
        baseURL: "https://open.bigmodel.cn/api/paas/v4/",
    });

    // Stream from the AI
    const stream = await openai.chat.completions.create({
        model: "glm-4.5",
        messages: [
            { role: "system", content: INIT_SYSTEM_PROMPT },
            {
                role: "user",
                content: `RAW TEXT:\n${rawText.substring(0, 12000)}`
            }
        ],
        temperature: 0.3,
        max_tokens: 4096,
        stream: true,
    });

    // Accumulate the full response, then flush as one JSON
    // via a TransformStream so the connection stays alive
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
        async start(controller) {
            let accumulated = "";
            try {
                for await (const chunk of stream) {
                    const delta = chunk.choices[0]?.delta?.content ?? "";
                    accumulated += delta;
                    // Send a keep-alive comment so Vercel
                    // doesn't kill the connection
                    controller.enqueue(
                        encoder.encode(`: chunk\n`)
                    );
                }

                // Parse and flush the final result
                let parsed: any = null;
                try {
                    const clean = accumulated
                        .replace(/```json/gi, "")
                        .replace(/```/g, "")
                        .trim();
                    parsed = JSON.parse(clean);
                } catch {
                    const match = accumulated.match(/\{[\s\S]*\}/);
                    if (match) parsed = JSON.parse(match[0]);
                }

                if (!parsed) {
                    controller.enqueue(
                        encoder.encode(
                            `data: ${JSON.stringify({ error: "Parse failed" })}\n\n`
                        )
                    );
                } else {
                    controller.enqueue(
                        encoder.encode(
                            `data: ${JSON.stringify({ result: parsed })}\n\n`
                        )
                    );
                }
            } catch (err: any) {
                controller.enqueue(
                    encoder.encode(
                        `data: ${JSON.stringify({ error: err.message })}\n\n`
                    )
                );
            } finally {
                controller.close();
            }
        },
    });

    return new Response(readable, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}
