import { createServerClient } from "@/utils/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PipelineStatusSelect } from "@/components/pipeline/status-select";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

export default async function PipelinePage() {
    const supabase = await createServerClient();
    if (!supabase) return <div className="p-8 font-mono text-red-500">Database Connection Failed</div>;

    // Service role key has no browser session — user may be null
    let user: any = null;
    try {
        const { data } = await supabase.auth.getUser();
        user = data?.user || null;
    } catch { /* no session */ }

    // Fetch applications with job details (all in single-owner mode)
    let query = supabase
        .from('applications')
        .select('*, jobs(*)')
        .order('updated_at', { ascending: false });

    if (user) query = query.eq('user_id', user.id);

    const { data: applications, error } = await query;

    if (error) return <div className="p-8">ERROR: {error.message}</div>;

    // Calculate Metrics
    const metrics = {
        saved: 0,
        applied: 0,
        interviewing: 0,
        offer: 0
    };

    applications?.forEach(app => {
        const s = app.status as keyof typeof metrics;
        if (metrics[s] !== undefined) metrics[s]++;
    });

    return (
        <div className="p-8 max-w-[1600px] mx-auto min-h-screen flex flex-col">
            <div className="mb-8 border-b-2 border-black pb-4 flex justify-between items-end">
                <div>
                    <h1 className="text-6xl font-black tracking-tighter mb-2">THE PIPELINE</h1>
                    <p className="font-mono text-sm opacity-60 uppercase tracking-widest">
                        Logistics & Command // Status Tracking
                    </p>
                </div>

                {/* Telemetry Widget */}
                <div className="flex gap-6 font-mono text-xl font-bold">
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] opacity-40 uppercase">SAVED</span>
                        <span>{metrics.saved}</span>
                    </div>
                    <div className="h-full w-[2px] bg-black/10"></div>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] opacity-40 uppercase">APPLIED</span>
                        <span>{metrics.applied}</span>
                    </div>
                    <div className="h-full w-[2px] bg-black/10"></div>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] opacity-40 uppercase">INTERVIEW</span>
                        <span>{metrics.interviewing}</span>
                    </div>
                    <div className="h-full w-[2px] bg-black/10"></div>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] opacity-40 uppercase">OFFERS</span>
                        <span>{metrics.offer}</span>
                    </div>
                </div>
            </div>

            <div className="font-mono">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-black font-bold uppercase w-[120px]">Status</TableHead>
                            <TableHead className="text-black font-bold uppercase w-[300px]">Role</TableHead>
                            <TableHead className="text-black font-bold uppercase">Company</TableHead>
                            <TableHead className="text-black font-bold uppercase text-right">Updated</TableHead>
                            <TableHead className="text-black font-bold uppercase text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {applications?.map((app) => (
                            <TableRow key={app.id}>
                                <TableCell>
                                    <PipelineStatusSelect applicationId={app.id} initialStatus={app.status || 'draft'} />
                                </TableCell>
                                <TableCell className="font-bold">{app.jobs?.title || "Unknown Job"}</TableCell>
                                <TableCell>
                                    {app.jobs?.company || "Unknown Company"}
                                </TableCell>
                                <TableCell className="text-right text-xs opacity-60">
                                    {new Date(app.updated_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Link href={`/forge/${app.jobs?.id}`}>
                                        <Button size="sm" variant="outline" className="border-black transition-none">
                                            WORKSPACE <ArrowUpRightIcon className="ml-2 w-3 h-3" />
                                        </Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                        {applications?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-32 opacity-40">
                                    NO ACTIVE TRACKING DATA
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

        </div>
    );
}
