import { createServerClient } from "@/utils/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { BookmarkButton } from "@/components/radar/bookmark-button";
import { SystemAlert } from "@/components/radar/system-alert";

export const dynamic = 'force-dynamic';

export default async function RadarPage() {
    const supabase = await createServerClient();
    if (!supabase) return <div className="p-8 font-mono text-red-500">Database Connection Failed</div>;

    // Service role key has no browser session — user may be null
    let user: any = null;
    try {
        const { data } = await supabase.auth.getUser();
        user = data?.user || null;
    } catch { /* no session */ }

    // Try sorting by match_score (requires migration 000002 to be applied)
    let jobs: any[] | null = null;
    let error: any = null;

    const result1 = await supabase
        .from('jobs')
        .select('*')
        .order('match_score', { ascending: false });

    if (result1.error?.message?.includes('does not exist')) {
        // Fallback: match_score column not yet in DB
        const result2 = await supabase
            .from('jobs')
            .select('*')
            .order('created_at', { ascending: false });
        jobs = result2.data;
        error = result2.error;

        // In-memory sort by metadata.match_score since DB column is missing
        if (jobs) {
            jobs.sort((a, b) => {
                const scoreA = a.match_score ?? a.metadata?.match_score ?? 0;
                const scoreB = b.match_score ?? b.metadata?.match_score ?? 0;
                return scoreB - scoreA;
            });
        }
    } else {
        jobs = result1.data;
        error = result1.error;
    }

    if (error) {
        return <div className="p-8 font-mono text-red-500">ERROR: {error.message}</div>;
    }

    // 2. Fetch User Applications (skip if no user)
    let applications: any[] = [];
    if (user) {
        const { data } = await supabase
            .from('applications')
            .select('job_id, status')
            .eq('user_id', user.id);
        applications = data || [];
    }

    // Map for O(1) lookup
    const statusMap = new Map(applications.map(app => [app.job_id, app.status]));

    // 3. Alerts Logic
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    let allApps: any[] = [];
    if (user) {
        const { data } = await supabase
            .from('applications')
            .select('job_id, status, updated_at')
            .eq('user_id', user.id);
        allApps = data || [];
    }

    const staleDrafts = allApps.filter(app =>
        app.status === 'draft' && new Date(app.updated_at) < threeDaysAgo
    ).length;

    const existingAppJobIds = new Set(allApps.map(a => a.job_id));
    const highMatchTargets = jobs?.filter(job =>
        ((job.match_score ?? job.metadata?.match_score) || 0) >= 80 && !existingAppJobIds.has(job.id)
    ).length || 0;


    return (
        <div className="p-8 max-w-[1600px] mx-auto">

            <SystemAlert staleDrafts={staleDrafts} highMatchTargets={highMatchTargets} />

            <div className="flex justify-between items-end mb-8 border-b-2 border-black pb-4">
                <div>
                    <h1 className="text-6xl font-black tracking-tighter mb-2">THE RADAR</h1>
                    <p className="font-mono text-sm opacity-60 uppercase tracking-widest">Global Intelligence Grid // Public Frequency</p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" className="font-mono">
                        SCAN_NETWORK
                    </Button>
                    <Button className="font-mono bg-black text-white hover:bg-black/80">
                        AUTO_APPLY [OFF]
                    </Button>
                </div>
            </div>

            <div className="font-mono">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[300px] text-black font-bold uppercase">Role</TableHead>
                            <TableHead className="w-[200px] text-black font-bold uppercase">Company</TableHead>
                            <TableHead className="text-black font-bold uppercase">Location</TableHead>
                            <TableHead className="text-black font-bold uppercase">Comp</TableHead>
                            <TableHead className="text-black font-bold uppercase text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {jobs?.map((job) => {
                            const meta = job.metadata || {};
                            // Format Salary
                            let salary = "---";
                            if (meta.tc_min || meta.tc_max) {
                                salary = `$${meta.tc_min || '?'}-${meta.tc_max || '?'}k`;
                            } else if (meta.salary) {
                                salary = meta.salary; // fallback string
                            }

                            const status = statusMap.get(job.id);
                            const score = job.match_score ?? job.metadata?.match_score ?? 0;

                            return (
                                <TableRow key={job.id} className="group cursor-pointer">
                                    <TableCell className="font-bold">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span>{job.title}</span>
                                                {score >= 80 && <Badge className="bg-black text-[8px] h-4">MATCH {score}%</Badge>}
                                            </div>
                                            <div className="flex gap-2 mt-1">
                                                {meta.remote && (
                                                    <Badge variant="outline" className="text-[10px] py-0 h-4 border-black/30">REMOTE</Badge>
                                                )}
                                                <Badge variant="outline" className="text-[10px] py-0 h-4 border-black/30">
                                                    {job.status || "manual"}
                                                </Badge>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{job.company}</TableCell>
                                    <TableCell>{meta.location || "Unknown"}</TableCell>
                                    <TableCell>{salary}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <BookmarkButton jobId={job.id} initialStatus={status || null} />
                                            <Link href={`/forge/${job.id}`}>
                                                <Button
                                                    size="sm"
                                                    className="bg-black text-white border-2 border-black px-3 py-1 font-mono uppercase text-xs tracking-widest hover:bg-[#F4F4F0] hover:text-black transition-colors rounded-none"
                                                >
                                                    INITIALIZE <ArrowUpRightIcon className="ml-2 w-3 h-3" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
