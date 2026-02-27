import { createServerClient } from "@/utils/supabase/server";

export interface JobInsert {
    company: string;
    title: string;
    url: string; // The unique key for conflict resolution
    location?: string;
    description?: string;
    source: string;
    metadata?: any;
}

export async function checkExists(url: string, supabase?: any): Promise<boolean> {
    const client = supabase || createServerClient();
    if (!client) {
        console.error("[DB ERROR] checkExists failed: Uninitialized client.");
        return true; // Fail safe to true to avoid duplicates if DB is offline.
    }

    // 1. Check primary jobs table
    const { data: jobMatch } = await client
        .from('jobs')
        .select('absolute_url')
        .eq('absolute_url', url)
        .limit(1)
        .single();

    if (jobMatch) return true;

    // 2. Check jobs_raw queue
    const { data: rawMatch } = await client
        .from('jobs_raw')
        .select('absolute_url')
        .eq('absolute_url', url)
        .limit(1)
        .single();

    if (rawMatch) return true;

    return false;
}

export async function upsertJobs(jobs: JobInsert[]) {
    const supabase = createServerClient();

    if (!supabase) {
        console.error("Supabase Admin Client failed to initialize.");
        return { error: "Supabase client uninitialized", count: 0 };
    }

    if (jobs.length === 0) return { count: 0 };

    const { data, error, count } = await supabase
        .from('jobs')
        .upsert(jobs, {
            onConflict: 'url',
            ignoreDuplicates: true
        })
        .select();

    if (error) {
        console.error('Error upserting jobs:', error);
        return { error, count: 0 };
    }

    console.log(`Successfully processed ${jobs.length} jobs.`);
    return { data, count: data?.length || 0 };
}
