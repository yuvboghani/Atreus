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
        const { data } = await supabase
            .from('profiles')
            .select('resume_text, skill_bank, onboarding_completed')
            .eq('id', user.id)
            .single();
        profile = data;
    }

    return (
        <ArsenalWorkspace
            initialResumeText={profile?.resume_text || ""}
            initialSkillBank={profile?.skill_bank || []}
            isOnboarded={profile?.onboarding_completed || false}
        />
    );
}
