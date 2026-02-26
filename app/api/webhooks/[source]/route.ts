import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { orchestrator } from '@/lib/ai/orchestrator';

// Helper to extract raw text/data from different sources
async function extractJobData(source: string, body: any): Promise<any[]> {
    switch (source) {
        // Category A: Native ATS (JSON Payloads)
        case 'greenhouse':
        case 'ashby':
        case 'lever':
            // These usually send a single job update or application creation.
            // We assume the body IS the job payload or contains it.
            // Simple strategy: Stringify the whole body to let AI extract details.
            // Or if we know the structure, we can be more specific.
            // For now, return [body] as a single item.
            return [body];

        // Category B: Scrapers (Batched JSON Arrays)
        case 'apify':
        case 'proxycurl':
            // Expecting an array of jobs or a wrapper containing items.
            if (Array.isArray(body)) return body;
            if (Array.isArray(body.items)) return body.items; // Common in Apify
            if (body.jobs && Array.isArray(body.jobs)) return body.jobs;
            return [body]; // Fallback to single item

        default:
            return [body];
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ source: string }> }) {
    const { source } = await params;

    try {
        const body = await req.json();
        const items = await extractJobData(source, body);

        console.log(`Received webhook from ${source} with ${items.length} items`);

        const supabase = createServerClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Database client initialization failed' }, { status: 500 });
        }

        // Fetch organization ID (fallback for now, ideally matched from payload or API key)
        const { data: orgData } = await supabase.from('organizations').select('id').limit(1).single();
        const defaultOrgId = orgData?.id;

        if (!defaultOrgId) {
            return NextResponse.json({ error: 'No default organization found' }, { status: 500 });
        }

        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[]
        };

        // Process items (Could be parallelized, but sequential for safety/rate limits)
        for (const item of items) {
            try {
                // 1. Standardize text representation
                const rawText = JSON.stringify(item);

                // 2. Use AI to standardize
                const standardizedProps = await orchestrator.standardizeJob(rawText);

                if (!standardizedProps.title || !standardizedProps.company) {
                    throw new Error('AI failed to extract Title or Company');
                }

                // 3. Upsert to Supabase
                const { error } = await supabase
                    .from('jobs')
                    .upsert({
                        company: standardizedProps.company,
                        title: standardizedProps.title,
                        raw_description: rawText,
                        organization_id: defaultOrgId,
                        metadata: {
                            salary_min: standardizedProps.salary_min,
                            salary_max: standardizedProps.salary_max,
                            yoe: standardizedProps.yoe,
                            tech_stack: standardizedProps.tech_stack,
                            location: standardizedProps.location,
                            remote_status: standardizedProps.remote_status,
                            source: source
                        }
                    }, { onConflict: 'company, title' });

                if (error) throw error;
                results.success++;

            } catch (e) {
                console.error(`Failed to process item from ${source}:`, e);
                results.failed++;
                results.errors.push(String(e));
            }
        }

        return NextResponse.json({
            message: 'Processing complete',
            stats: results
        });

    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
