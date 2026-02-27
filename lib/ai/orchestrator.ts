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

export const GLM_MODELS = ["glm-4.5", "glm-4.5-x", "glm-4.5-air", "glm-4.5-airx", "glm-4.5-flash", "glm-4-plus", "glm-4"];

const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

async function callZhipuAI(systemPrompt: string, userPrompt: string, model: string = 'glm-4-plus') {
    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey) throw new Error('ZHIPU_API_KEY not configured');

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

    if (!response.ok && response.status === 400 && model === 'glm-4-plus') {
        console.warn("[AI ERROR] Model rejected. Fallback initiated.");
        const fallbackModel = "glm-4";
        console.log("[AI] Requesting model ID:", fallbackModel);

        response = await fetch(ZHIPU_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: fallbackModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.2,
                top_p: 0.7
            })
        });
    }

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

        const rawResponse = await callZhipuAI(systemPrompt, previewText, 'glm-4-plus');
        const jsonString = rawResponse.replace(/```json\n?|\n?```/g, '').trim();

        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.warn("Failed to parse standardized job JSON");
            throw new Error("Failed to parse Standardized Job JSON");
        }
    }
};
