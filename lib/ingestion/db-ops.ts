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
