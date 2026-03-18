import { createServerClient } from "@/utils/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { BookmarkButton } from "@/components/radar/bookmark-button";
import { SystemAlert } from "@/components/radar/system-alert";
import { IntelModal } from "@/components/radar/intel-modal";

export const dynamic = 'force-dynamic';

export default async function RadarPage() {
    const supabase = await createServerClient();
    if (!supabase) return <div className="p-8 font-mono text-red-500">Database Connection Failed</div>;

    let user: any = null;
    try {
        const { data } = await supabase.auth.getUser();
        user = data?.user || null;
    } catch { /* no session */ }

    // Fetch jobs sorted by match_score
    let jobs: any[] | null = null;
    let error: any = null;

    const result1 = await supabase
        .from('jobs')
        .select('*')
        .order('match_score', { ascending: false });

    if (result1.error?.message?.includes('does not exist')) {
        const result2 = await supabase
            .from('jobs')
            .select('*')
            .order('created_at', { ascending: false });
        jobs = result2.data;
        error = result2.error;

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

    // User Applications
    let applications: any[] = [];
    if (user) {
        const { data } = await supabase
            .from('applications')
            .select('job_id, status')
            .eq('user_id', user.id);
        applications = data || [];
    }

    const statusMap = new Map(applications.map(app => [app.job_id, app.status]));

    // Alerts
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
                    <p className="font-mono text-sm opacity-60 uppercase tracking-widest">Global Intelligence Grid // V5 Deep Extraction</p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" className="font-mono" asChild>
                        <Link href="/api/radar/scan" target="_blank">
                            SCAN_NETWORK
                        </Link>
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
                            <TableHead className="w-[280px] text-black font-bold uppercase">Role</TableHead>
                            <TableHead className="w-[160px] text-black font-bold uppercase">Company</TableHead>
                            <TableHead className="text-black font-bold uppercase">Stack</TableHead>
                            <TableHead className="text-black font-bold uppercase">Location</TableHead>
                            <TableHead className="text-black font-bold uppercase">Comp</TableHead>
                            <TableHead className="text-black font-bold uppercase text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {jobs?.map((job) => {
                            const meta = job.metadata || {};
                            const techStack = job.tech_stack || meta.tech_stack || [];
                            const remote = job.remote_status || meta.remote_status;

                            // Salary: prefer dedicated column
                            let salary = "N/A";
                            if (job.salary_range) {
                                salary = job.salary_range;
                            } else if (meta.salary_min || meta.salary_max) {
                                salary = `$${meta.salary_min || '?'}k-$${meta.salary_max || '?'}k`;
                            } else if (meta.salary) {
                                salary = meta.salary;
                            }

                            const status = statusMap.get(job.id);
                            const score = job.match_score ?? meta.match_score ?? 0;

                            return (
                                <TableRow key={job.id} className="group cursor-pointer">
                                    <TableCell className="font-bold">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span>{job.title}</span>
                                                {score >= 80 && <Badge className="bg-black text-[8px] h-4">MATCH {score}%</Badge>}
                                                {score > 0 && score < 80 && <Badge variant="outline" className="text-[8px] h-4 border-black/30">{score}%</Badge>}
                                            </div>
                                            <div className="flex gap-1 mt-1">
                                                {remote && remote !== 'unknown' && (
                                                    <Badge variant="outline" className="text-[10px] py-0 h-4 border-black/30 uppercase">
                                                        {remote}
                                                    </Badge>
                                                )}
                                                {job.scrape_status === 'full_content' && (
                                                    <Badge variant="outline" className="text-[10px] py-0 h-4 border-green-500/50 text-green-700">
                                                        DEEP
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{job.company}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                                            {techStack.slice(0, 4).map((t: string, i: number) => (
                                                <Badge key={i} variant="outline" className="text-[9px] py-0 h-4 border-black/20">
                                                    {t}
                                                </Badge>
                                            ))}
                                            {techStack.length > 4 && (
                                                <Badge variant="outline" className="text-[9px] py-0 h-4 border-black/20">
                                                    +{techStack.length - 4}
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{meta.location || "Unknown"}</TableCell>
                                    <TableCell>{salary}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <IntelModal job={job} />
                                            <BookmarkButton jobId={job.id} initialStatus={status || null} />
                                            <Link href={`/forge/${job.id}`} className="bg-black text-white px-3 py-1 font-mono uppercase text-xs tracking-widest hover:bg-[#F4F4F0] hover:text-black border-2 border-black inline-flex items-center transition-colors">
                                                FORGE <ArrowUpRightIcon className="ml-2 w-3 h-3" />
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
