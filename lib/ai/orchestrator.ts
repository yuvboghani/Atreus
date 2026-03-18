export interface GapAnalysis {
    missing_skills: string[];
    recommended_projects: {
        title: string;
        description: string;
        tech_stack: string[];
        duration: string;
    }[];
}

export interface TailoredResume {
    latex_content: string;
    changes_summary: string[];
}

export interface StandardizedJob {
    title: string;
    company: string;
    salary_min: number | null;
    salary_max: number | null;
    yoe: string | number | null;
    tech_stack: string[];
    location: string | null;
    remote_status: 'remote' | 'onsite' | 'hybrid' | 'unknown';
}

const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

async function callZhipuAI(systemPrompt: string, userPrompt: string, model: string = 'glm-4.5') {
    const apiKey = process.env.ZAI_API_KEY || process.env.ZHIPU_API_KEY;
    if (!apiKey) throw new Error('ZAI_API_KEY not configured');

    console.log("[AI] Requesting model ID:", model);
    let response = await fetch(ZHIPU_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.2,
            top_p: 0.7
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        let requestID = "UNKNOWN";
        try {
            const errJson = JSON.parse(errorText);
            requestID = errJson.error?.request_id || errJson.request_id || "UNKNOWN";
        } catch (e) { }
        console.error(`[AI ERROR] ZhipuAI failed with status ${response.status}. requestID: ${requestID}`);
        console.error(`[AI ERROR DETAILS]: ${errorText}`);
        throw new Error(`ZhipuAI API Error: ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
}

export const orchestrator = {
    analyzeGap: async (resumeText: string, jobDescription: string): Promise<GapAnalysis> => {
        const systemPrompt = `You are a Career Strategist AI. Compare the Resume against the Job Description.
    Identify missing critical skills.
    Propose 1-2 "1-Week Projects" that a candidate could build quickly to demonstrate these missing skills.
    
    Output STRICTLY VALID JSON in the following format:
    {
      "missing_skills": ["skill1", "skill2"],
      "recommended_projects": [
        {
          "title": "Project Name",
          "description": "Short description of what to build",
          "tech_stack": ["tool1", "tool2"],
          "duration": "1 week"
        }
      ]
    }
    `;

        const userPrompt = `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}`;

        const rawResponse = await callZhipuAI(systemPrompt, userPrompt, 'glm-4-plus');
        const jsonString = rawResponse.replace(/```json\n?|\n?```/g, '').trim();

        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.warn("Failed to parse gap analysis JSON, returning raw text in error structure if possible or throwing");
            // Fallback or rethrow
            throw new Error("Failed to parse Gap Analysis JSON");
        }
    },

    tailorResume: async (resumeLatex: string, jobDescription: string): Promise<TailoredResume> => {
        const systemPrompt = `You are an Expert LaTeX Resume Writer. 
    Rewrite the resume content to better align with the Job Description.
    - Highlight relevant skills.
    - Rephrase bullet points to use keywords from the JD.
    - Maintain valid LaTeX syntax suitable for pdflatex.
    - DO NOT remove the structure/header commands. Focus on content.
    
    Output STRICTLY VALID JSON:
    {
      "latex_content": "Full tailored LaTeX code...",
      "changes_summary": ["List of key changes made..."]
    }
    `;

        const userPrompt = `RESUME LATEX:\n${resumeLatex}\n\nJOB DESCRIPTION:\n${jobDescription}`;

        const rawResponse = await callZhipuAI(systemPrompt, userPrompt, 'glm-4-plus');
        const jsonString = rawResponse.replace(/```json\n?|\n?```/g, '').trim();

        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.warn("Failed to parse tailored resume JSON");
            throw new Error("Failed to parse Tailored Resume JSON");
        }
    },

    standardizeJob: async (rawText: string): Promise<StandardizedJob> => {
        const systemPrompt = `You are a Data Standardization AI. Extract structured job data from the provided text/JSON.
    
    Output STRICTLY VALID JSON with the following schema:
    {
      "title": "Job Title",
      "company": "Company Name",
      "salary_min": number or null,
      "salary_max": number or null,
      "yoe": "years of experience" (string or number or null),
      "tech_stack": ["tech1", "tech2"],
      "location": "City, Country" or null,
      "remote_status": "remote" | "onsite" | "hybrid" | "unknown"
    }

    If data is missing, use null. Parse salary to numbers if possible (annual).
    `;

        // Truncate rawText if too long to avoid token limits? GLM-4 is generous but good practice.
        const previewText = rawText.substring(0, 10000);

        const rawResponse = await callZhipuAI(systemPrompt, previewText, 'glm-4.5');
        const jsonString = rawResponse.replace(/```json\n?|\n?```/g, '').trim();

        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.warn("Failed to parse standardized job JSON");
            throw new Error("Failed to parse Standardized Job JSON");
        }
    },

    gapFillExtract: async (jobsBatch: any[]): Promise<any> => {
        const systemPrompt = `You are a Data Gap-Fill Engine. 
    I will provide a JSON array of jobs. Each job has a 'snippet' and 'regex_data' (fields already extracted).
    Return a JSON array of objects aligning to the exact inputs, containing ONLY the missing fields.
    Schema per job: 
    {
       "salary_min": number | null,
       "salary_max": number | null,
       "yoe": string | number | null,
       "tech_stack": ["skill1", "skill2"],
       "location": "City, Country" | "Remote" | null
    }
    Rules:
    - If a field is already in regex_data, DO NOT overwrite unless you found a better match.
    - Zero "Interests". Strict Keyword/YoE match only. Map tech stack to Master Skill Bank.
    - Return ONLY the raw JSON array. No markdown code blocks.`;

        const userPrompt = JSON.stringify(jobsBatch, null, 2);

        const rawResponse = await callZhipuAI(systemPrompt, userPrompt, 'glm-4.5-flash');
        const jsonString = rawResponse.replace(/```json\n?|\n?```/g, '').trim();

        try {
            return { data: JSON.parse(jsonString) };
        } catch (e) {
            console.warn("[AI ERROR] Failed to parse Gap-Fill JSON:", e, jsonString);
            return { data: [] };
        }
    },

    deepExtract: async (
        fullMarkdown: string,
        regexData: any
    ): Promise<any> => {
        const systemPrompt = `You are an elite Job Description Analyst with STRICT scoring standards.
    You will receive a FULL job description in Markdown format, plus any fields already extracted by regex.

    ANALYSIS PRIORITY ORDER:
    1. "Requirements" / "Qualifications" / "Must Have" sections carry 3x weight.
    2. "Responsibilities" / "What You'll Do" carry 2x weight.
    3. "About Us" / "Benefits" / "Perks" carry 0x weight — IGNORE for extraction.

    Return a SINGLE JSON object:
    {
       "salary_min": number | null,
       "salary_max": number | null,
       "salary_range": "e.g. $120k-$160k" | null,
       "yoe": number | null,
       "tech_stack": ["Python", "Kubernetes", ...],
       "location": "City, State" | "Remote" | null,
       "remote_status": "remote" | "hybrid" | "onsite" | "unknown",
       "key_priorities": [
           "Bullet 1: the core mission or deliverable",
           "Bullet 2: a critical technical requirement",
           "Bullet 3: the ideal candidate trait or experience"
       ]
    }

    STRICT RULES:
    - key_priorities MUST be EXACTLY 3 bullets. Be specific and actionable. No generic filler like "strong communication skills".
    - tech_stack: Extract ALL languages, frameworks, tools, platforms, and cloud services mentioned in Requirements/Qualifications. Normalize names (e.g. "JS" → "JavaScript", "k8s" → "Kubernetes", "GCP" → "Google Cloud").
    - salary: Parse to annual numbers in thousands. "$120,000" → 120. Range "$120k-$160k" → min=120, max=160, salary_range="$120k-$160k".
    - If regex_data already has a value, keep it unless you found a CLEARLY BETTER match.
    - Return ONLY the raw JSON object. No markdown code blocks. No explanations.`;

        const userPrompt = `REGEX DATA (already extracted):\n${JSON.stringify(regexData, null, 2)}\n\nFULL JOB DESCRIPTION:\n${fullMarkdown}`;

        const rawResponse = await callZhipuAI(
            systemPrompt, userPrompt, 'glm-4.5-flash'
        );
        const jsonString = rawResponse
            .replace(/```json\n?|\n?```/g, '').trim();

        try {
            return { data: JSON.parse(jsonString) };
        } catch (e) {
            console.warn(
                "[AI ERROR] Failed to parse Deep Extract JSON:",
                e, jsonString
            );
            return { data: null };
        }
    }
};
