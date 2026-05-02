import { createAuthClient } from "@/utils/supabase/auth-server";
import { createServerClient } from "@/utils/supabase/server";
import { ArsenalWorkspace } from "@/components/arsenal/arsenal-workspace";

export default async function ArsenalPage() {
    const authClient = await createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();

    const supabase = await createServerClient();
    if (!supabase) {
        return (
            <div className="p-8 text-red-500 font-mono">
                Database Connection Failed
            </div>
        );
    }

    let profile = null;
    if (user) {
        // Select only the core columns that always exist.
        // onboarding_completed may not be in schema yet.
        const { data } = await supabase
            .from('profiles')
            .select('resume_text, skill_bank')
            .eq('id', user.id)
            .maybeSingle();
        profile = data;
    }

    return (
        <ArsenalWorkspace
            initialResumeText={profile?.resume_text || ""}
            initialSkillBank={profile?.skill_bank || []}
            isOnboarded={false}
        />
    );
}
