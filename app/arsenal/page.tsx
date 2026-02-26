import { createAuthClient } from "@/utils/supabase/auth-server";
import { createServerClient } from "@/utils/supabase/server";
import { ProfileForm } from "@/components/arsenal/profile-form";

export default async function ArsenalPage() {
    // Use cookie-based auth client to get the authenticated user
    const authClient = await createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();

    // Use service-role client for DB reads (bypasses RLS)
    const supabase = await createServerClient();
    if (!supabase) return <div className="p-8 text-red-500">Database Connection Failed</div>;


    let profile = null;
    if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        profile = data;
    }

    const defaultResume = profile?.resume_text || "";
    const defaultSkills = profile?.skill_bank?.join(", ") || "";
    const skillBank = profile?.skill_bank || [];

    return (
        <div className="p-8 max-w-4xl mx-auto min-h-screen flex flex-col">
            <div className="mb-8 border-b-2 border-black pb-4 flex justify-between items-end">
                <div>
                    <h1 className="text-6xl font-black tracking-tighter mb-2">THE ARSENAL</h1>
                    <p className="font-mono text-sm opacity-60 uppercase tracking-widest">
                        Asset Management // Profile Core
                    </p>
                </div>
                <div className="font-mono text-xs opacity-60">
                    ID: {user?.id?.substring(0, 8) || "UNKNOWN"}
                </div>
            </div>

            <ProfileForm
                defaultResume={defaultResume}
                defaultSkills={defaultSkills}
                skillBank={skillBank}
            />
        </div>
    );
}
