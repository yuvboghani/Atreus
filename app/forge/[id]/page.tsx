import { createServerClient } from "@/utils/supabase/server";
import { createAuthClient } from "@/utils/supabase/auth-server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { ForgeShell } from "@/components/forge/forge-shell";

export const dynamic = 'force-dynamic';

export default async function ForgeWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createServerClient();
    if (!supabase) return <div>Database Connection Failed</div>;
    const { id } = await params;

    // Fetch job details
    const { data: job, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !job) {
        return <div className="p-8 text-red-500 font-mono">JOB_NOT_FOUND // {id}</div>;
    }

    // Fetch user profile for gap analysis
    let skillBank: string[] = [];
    try {
        const authClient = await createAuthClient();
        const { data: { user } } = await authClient.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('skill_bank')
                .eq('id', user.id)
                .single();
            skillBank = profile?.skill_bank || [];
        }
    } catch { /* no session — gap analysis will show all as missing */ }

    return (
        <div className="h-screen flex flex-col overflow-hidden font-mono bg-[#F4F4F0] text-[#111111]">
            {/* HEADER */}
            <div className="h-14 border-b-2 border-black flex items-center px-4 justify-between bg-white z-10">
                <div className="flex items-center gap-4">
                    <Link href="/radar">
                        <Button variant="ghost" size="icon" className="hover:bg-black hover:text-white rounded-none">
                            <ArrowLeftIcon className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h1 className="font-bold uppercase tracking-tight text-sm leading-none">{job.title}</h1>
                            <Badge variant="outline" className="border-black text-[10px] py-0 h-4 rounded-none">{job.company}</Badge>
                        </div>
                        <div className="text-[10px] opacity-60 uppercase tracking-widest">{id.substring(0, 8)} // THE_FORGE</div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge className="bg-black text-white rounded-none hover:bg-black">STATUS: TAILORING</Badge>
                </div>
            </div>

            {/* WORKSPACE — Client Shell handles 2 panes + shared state */}
            <ForgeShell job={job} skillBank={skillBank} />
        </div>
    );
}
