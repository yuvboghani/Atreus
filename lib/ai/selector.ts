import OpenAI from "openai";

// Initialize OpenAI client for ZhipuAI
const openai = new OpenAI({
    apiKey: process.env.ZAI_API_KEY,
    baseURL: "https://open.bigmodel.cn/api/paas/v4/"
});

/**
 * STRATEGY: GLM-4-Flash
 * Use Case: High-speed, low-cost tasks (extraction, classification).
 * Cost Target: Minimal.
 */
export async function extractJson(text: string): Promise<{ data: any, usage: any }> {
    const model = "glm-4.5-flash";
    try {
        const response = await openai.chat.completions.create({
            model,
            messages: [
                {
                    role: "system",
                    content: `You are a strict JSON parser. You extract job details from raw text.
          Return ONLY valid JSON with this schema:
          {
            "title": "Job Title",
            "company": "Company Name",
            "salary_min": number | null,
            "salary_max": number | null,
            "location": "City, Country" | "Remote",
            "tech_stack": ["Skill1", "Skill2"]
          }
          If a field is missing, use null. Do not include markdown code blocks.
          CRITICAL: Normalize 'tech_stack' to industry standards (e.g., 'React.js' -> 'React', 'NodeJS' -> 'Node'). Return only the normalized array.`
                },
                {
                    role: "user",
                    content: text
                }
            ],
            temperature: 0.1, // Deterministic
            max_tokens: 1024,
            top_p: 0.7
        });

        const content = response.choices[0]?.message?.content || "{}";
        // Strip markdown if present
        const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim();

        console.log(`[AI] Intelligence Locked: Using ${model}`);

        return {
            data: JSON.parse(cleanContent),
            usage: response.usage
        };
    } catch (error: any) {
        console.error(`[AI ERROR] The Parser failed on model ${model}:`, error);
        throw new Error("Failed to extract JSON from job description.");
    }
}

/**
 * STRATEGY: GLM-4-Air
 * Use Case: Balanced reasoning (Assistants, Drafting).
 * Cost Target: Moderate.
 */
export async function chatAgent(history: { role: "system" | "user" | "assistant", content: string }[], model: string = "glm-4.5"): Promise<{ content: string, usage: any }> {
    try {
        const response = await openai.chat.completions.create({
            model, // Forcing Plus for reliability
            messages: history,
            temperature: 0.7, // Creative but grounded
            max_tokens: 2048
        });
        return {
            content: response.choices[0]?.message?.content || "",
            usage: response.usage
        };
    } catch (error) {
        console.error("The Strategist failed:", error);
        return {
            content: "I am unable to strategize at the moment.",
            usage: null
        };
    }
}

/**
 * STRATEGY: GLM-4-Plus (or Flagship)
 * Use Case: Deep reasoning, complex coding, critical analysis.
 * Cost Target: High (Use sparingly).
 */
export async function deepReasoning(prompt: string, context?: any, model: string = "glm-4.5") {
    try {
        const jobContext = context ? `JOB_CONTEXT: Role: ${context.title} @ ${context.company}. Key Reqs: ${JSON.stringify(context.tech_stack)}` : "";

        // THE SURGEON'S PROTOCOL
        const surgeonSystemPrompt = `
      ROLE: You are an elite Resume Engineer.
      OBJECTIVE: Rewrite the user's input into Dense-Compact LaTeX bullet points optimized for ATS systems.
      
      CONSTRAINTS:
      1. FORMAT: Return ONLY raw LaTeX code. No markdown blocks. Use standard resume item structure.
      2. FORMULA: Every bullet MUST follow: "Developed [A] by utilizing [B] to achieve results of [C]".
      3. TONE: Brutal, direct, technical. NO FLUFF.
         - BANNED WORDS: "Architected", "Spearheaded", "Synergized", "Revolutionized", "Passionate".
         - USE VERBS: Built, Created, Deployed, Engineered, Optimized.
      4. LENGTH: Force bullet length to 110-120 chars per line. Max 2 lines.
      5. ATS: Swap generic terms with exact keywords from the Job Description below.
      6. ESCAPING: You MUST properly escape all special characters (e.g., change "&" to "\\&"). DO NOT rewrite the user's sentence to avoid special characters. Prefer using "\\&" instead of "and" if appropriate, but prioritized formatting.
      
      ${jobContext}
      
      INPUT DATA:
      ${prompt}
    `;

        const response = await openai.chat.completions.create({
            model,
            messages: [
                { role: "system", content: surgeonSystemPrompt },
                { role: "user", content: "OPTIMIZE THIS CONTENT." }
            ],
            temperature: 0.3, // Low temp for adherence to constraints
            max_tokens: 4096
        });

        // Clean potential markdown just in case
        const raw = response.choices[0]?.message?.content || "";
        const content = raw.replace(/```latex/g, "").replace(/```/g, "").trim();

        return {
            content,
            usage: response.usage
        };

    } catch (error) {
        console.error("The Surgeon failed:", error);
        throw new Error("Deep reasoning module offline.");
    }
}
