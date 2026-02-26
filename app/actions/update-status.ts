'use server';

import { createServerClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateApplicationStatus(applicationId: string, newStatus: string) {
    const supabase = await createServerClient();
    if (!supabase) throw new Error("Supabase client failed");
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { error } = await supabase
        .from('applications')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', applicationId)
        .eq('user_id', user.id);

    if (error) {
        console.error("Status update failed:", error);
        throw new Error("Failed to update status");
    }

    revalidatePath("/pipeline");
    return { success: true };
}

export async function markJobAsApplied(jobId: string) {
    const supabase = await createServerClient();
    if (!supabase) throw new Error("Supabase client failed");
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Upsert 'applied' status
    const { error } = await supabase
        .from('applications')
        .upsert({
            user_id: user.id,
            job_id: jobId,
            status: 'applied',
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, job_id' });

    if (error) {
        console.error("Mark applied failed:", error);
        throw new Error("Failed to mark as applied");
    }

    revalidatePath("/radar");
    revalidatePath("/pipeline");
    return { success: true };
}
