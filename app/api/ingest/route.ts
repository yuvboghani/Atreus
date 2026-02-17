import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        // 1. Call ZhipuAI (GLM-4-Flash) to parse the text
        const zhipuApiKey = process.env.ZHIPU_API_KEY;
        if (!zhipuApiKey) {
            console.error('ZHIPU_API_KEY is missing');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // ZhipuAI OpenAI-compatible endpoint
        const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${zhipuApiKey}`
            },
            body: JSON.stringify({
                model: 'glm-4-flash',
                messages: [
                    {
                        role: 'system',
                        content: `You are a helpful assistant that extracts structured data from job descriptions.
Output ONLY a valid JSON object with the following keys:
- title (string): The job title
- company (string): The company name
- salary (string, optional): The salary range or null if not found
- tech_stack (array of strings): List of technologies mentioned

Do not include any markdown formatting (like '''json). Just the raw JSON object.`
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ],
                temperature: 0.1
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ZhipuAI API Error:', errorText);
            return NextResponse.json({ error: 'Failed to process text with AI' }, { status: 500 });
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) {
            return NextResponse.json({ error: 'AI returned empty response' }, { status: 500 });
        }

        // Clean up potential markdown code blocks if the model ignores instruction
        const jsonString = content.replace(/```json\n?|\n?```/g, '').trim();

        let parsedData;
        try {
            parsedData = JSON.parse(jsonString);
        } catch (e) {
            console.error('Failed to parse AI response as JSON:', content);
            return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 500 });
        }

        const { title, company, salary, tech_stack } = parsedData;

        if (!title || !company) {
            return NextResponse.json({ error: 'AI failed to extract title or company' }, { status: 422 });
        }

        // 2. Upsert into Supabase using Service Role
        const supabase = createServerClient();

        if (!supabase) {
            return NextResponse.json({ error: 'Database client initialization failed' }, { status: 500 });
        }

        // Fetch organization ID (fallback to first available if multiple, or specific default)
        const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('id')
            .limit(1)
            .single();

        if (orgError || !orgData) {
            // Fallback or error
            console.error('Failed to find organization:', orgError);
            // Depending on requirements, we might want to create one or fail.
            // For now, we'll try to proceed without org ID if schema allows (it doesn't), so we must fail or use a known default.
            // But since we checked schema and it's NOT NULL, we must providing it.
            return NextResponse.json({ error: 'No organization found to assign job to' }, { status: 500 });
        }

        const { data: job, error: dbError } = await supabase
            .from('jobs')
            .upsert(
                {
                    company,
                    title,
                    raw_description: text, // Changed from description to raw_description per schema
                    organization_id: orgData.id,
                    metadata: {
                        salary,
                        tech_stack
                    }
                },
                { onConflict: 'company, title' }
            )
            .select('id')
            .single();

        if (dbError) {
            console.error('Supabase Error:', dbError);
            return NextResponse.json({ error: 'Failed to save job to database' }, { status: 500 });
        }

        return NextResponse.json({ id: job.id, parsed: parsedData });

    } catch (error) {
        console.error('Ingestion Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
