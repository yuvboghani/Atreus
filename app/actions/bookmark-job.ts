'use server';

import { createServerClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function bookmarkJob(jobId: string) {
    const supabase = await createServerClient();
    if (!supabase) throw new Error("Supabase client failed");
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Upsert 'saved' status. 
    // If it exists, we don't overwrite if it's already in a more advanced state?
    // Actually instructions say: "INSERT ... VALUES ... 'saved'".
    // Robustness: ON CONFLICT (user_id, job_id) DO NOTHING to prevent overwriting an 'applied' status with 'saved'.

    // Checking if application exists first is safer to avoid downgrading status.
    const { data: existing } = await supabase
        .from('applications')
        .select('status')
        .eq('user_id', user.id)
        .eq('job_id', jobId)
        .single();

    if (existing) {
        // Already tracked. Do nothing.
        return { success: true, status: existing.status };
    }

    const { error } = await supabase
        .from('applications')
        .insert({
            user_id: user.id,
            job_id: jobId,
            status: 'saved'
        });

    if (error) {
        console.error("Bookmark failed:", error);
        throw new Error("Failed to bookmark job");
    }

    // Flip the flag on the jobs table to protect it from the Janitor
    await supabase
        .from('jobs')
        .update({ is_saved: true })
        .eq('id', jobId);

    revalidatePath("/radar");
    revalidatePath("/pipeline");
    return { success: true, status: 'saved' };
}
