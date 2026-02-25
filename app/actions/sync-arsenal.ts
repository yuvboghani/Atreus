'use server';

import { createServerClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function syncToArsenal(text: string) {
    const supabase = await createServerClient();
    if (!supabase) throw new Error("Supabase client failed");
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // 1. Fetch existing profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('resume_text')
        .eq('id', user.id)
        .single();

    let currentText = profile?.resume_text || "";

    // 2. Append new bullet
    // Ensure we don't duplicate if already exists (basic check)
    if (!currentText.includes(text)) {
        currentText += `\n\n${text}`;
    } else {
        return { success: true, message: "ALREADY_SYNCED" };
    }

    // 3. Update Profile
    const { error } = await supabase
        .from('profiles')
        .update({
            resume_text: currentText,
            updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

    if (error) {
        console.error("Sync failed:", error);
        throw new Error("Failed to sync to Arsenal");
    }

    revalidatePath("/arsenal");
    return { success: true, message: "SYNCED" };
}
