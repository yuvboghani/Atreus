import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { refineJob } from '@/lib/radar/engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json(
                { error: 'Unauthorized' }, { status: 401 }
            );
        }

        const supabase = await createServerClient();
        if (!supabase) {
            return NextResponse.json(
                { error: "DB Fail" }, { status: 500 }
            );
        }

        // Fetch exactly ONE job from queue
        const { data: rawJob, error: fetchErr } = await supabase
            .from('jobs_raw')
            .select('*')
            .eq('is_processed', false)
            .order('created_at', { ascending: true })
            .limit(1)
            .single();

        if (fetchErr || !rawJob) {
            return NextResponse.json(
                { message: "Queue empty", refined: 0 }
            );
        }

        // Delegate to Engine (AI + Score + Insert + Purge)
        const result = await refineJob(rawJob);

        return NextResponse.json({
            success: true,
            refined: 1,
            job: result.title
        });

    } catch (error: any) {
        console.error("[ARCHITECT] Failed:", error);
        return NextResponse.json(
            { error: error.message }, { status: 500 }
        );
    }
}
