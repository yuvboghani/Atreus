'use server';

import { createAuthClient } from "@/utils/supabase/auth-server";
import { createServerClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
    // First try cookie-based auth client to get the user
    const authClient = await createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
        throw new Error("Not authenticated — cannot update profile");
    }

    // Use service-role client for the actual DB write (bypasses RLS for upsert)
    const supabase = await createServerClient();
    if (!supabase) throw new Error("Supabase client failed");

    const rawResume = formData.get("resume") as string;
    const rawSkills = formData.get("skills") as string;
    const skillsArray = rawSkills.split(",").map(s => s.trim()).filter(Boolean);

    const { error } = await supabase
        .from("profiles")
        .upsert({
            id: user.id,
            resume_text: rawResume,
            skill_bank: skillsArray,
            updated_at: new Date().toISOString()
        });

    if (error) {
        console.error("Profile update failed:", error);
        throw new Error("Failed to update profile");
    }

    revalidatePath("/arsenal");
}
