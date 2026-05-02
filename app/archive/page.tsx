'use client';

import { useState, useEffect } from 'react';
import {
    FileTextIcon, DownloadIcon, CalendarIcon,
    BuildingIcon, Loader2Icon, ArchiveIcon,
    ExternalLinkIcon, CopyIcon, CheckIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Application {
    id: string;
    status: string;
    gap_analysis: any;
    created_at: string;
    updated_at: string;
    job: {
        id: string;
        title: string;
        company: string;
        url: string;
    } | null;
    tailored_resume: {
        id: string;
        content_tex: string;
        created_at: string;
    } | null;
}

export default function ArchivePage() {
    const [apps, setApps] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        async function fetchArchive() {
            try {
                const res = await fetch('/api/archive/fetch');
                if (!res.ok) throw new Error('Failed to load');
                const { applications } = await res.json();
                setApps(applications || []);
            } catch (err) {
                console.error('[ARCHIVE]', err);
            } finally {
                setLoading(false);
            }
        }
        fetchArchive();
    }, []);

    const handleCopyLatex = (id: string, tex: string) => {
        navigator.clipboard.writeText(tex);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleDownloadTex = (app: Application) => {
        if (!app.tailored_resume) return;
        const blob = new Blob(
            [app.tailored_resume.content_tex],
            { type: 'text/plain' }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const company = app.job?.company || 'unknown';
        const title = app.job?.title || 'resume';
        a.download = `${company}_${title}.tex`
            .replace(/[^a-zA-Z0-9_.]/g, '_');
        a.click();
        URL.revokeObjectURL(url);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(
            'en-US',
            { month: 'short', day: 'numeric', year: 'numeric' }
        );
    };

    const statusColor = (status: string) => {
        switch (status) {
            case 'tailoring': return 'bg-yellow-500';
            case 'submitted': return 'bg-blue-500';
            case 'rejected': return 'bg-red-500';
            case 'ghosted': return 'bg-gray-500';
            default: return 'bg-black';
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2Icon className="w-8 h-8 animate-spin opacity-30" />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-10 border-b-2 border-black pb-4 flex justify-between items-end">
                <div>
                    <h1 className="text-6xl font-black tracking-tighter mb-2">
                        THE ARCHIVE
                    </h1>
                    <p className="font-mono text-sm opacity-60 uppercase tracking-widest">
                        Document Vault // Historical Assets
                    </p>
                </div>
                <div className="font-mono text-xs opacity-60">
                    {apps.length} ASSET{apps.length !== 1 ? 'S' : ''}
                </div>
            </div>

            {/* Empty State */}
            {apps.length === 0 && (
                <div className="border-2 border-dashed border-black/20 p-16 text-center">
                    <ArchiveIcon className="w-12 h-12 mx-auto opacity-20 mb-4" />
                    <p className="font-mono text-sm opacity-40 uppercase">
                        No tailored assets yet
                    </p>
                    <p className="font-mono text-xs opacity-30 mt-2">
                        Head to The Forge to create your first tailored resume
                    </p>
                </div>
            )}

            {/* Document Gallery */}
            <div className="grid gap-4">
                {apps.map(app => (
                    <div
                        key={app.id}
                        className="border-2 border-black bg-white p-6 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow"
                    >
                        <div className="flex items-start justify-between gap-4">
                            {/* Left: Info */}
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                                <div className="w-12 h-12 border-2 border-black flex items-center justify-center shrink-0">
                                    <FileTextIcon className="w-6 h-6" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-bold text-lg uppercase tracking-tight truncate">
                                            {app.job?.title || 'Ad-Hoc Resume'}
                                        </h3>
                                        <Badge
                                            className={`${statusColor(app.status)} text-white text-[10px] rounded-none uppercase`}
                                        >
                                            {app.status}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-4 mt-1 text-xs font-mono opacity-60">
                                        {app.job?.company && (
                                            <span className="flex items-center gap-1">
                                                <BuildingIcon className="w-3 h-3" />
                                                {app.job.company}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <CalendarIcon className="w-3 h-3" />
                                            {formatDate(app.created_at)}
                                        </span>
                                    </div>
                                    {app.job?.url && (
                                        <a
                                            href={app.job.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] font-mono opacity-40 hover:opacity-80 flex items-center gap-1 mt-1"
                                        >
                                            <ExternalLinkIcon className="w-3 h-3" />
                                            {app.job.url.substring(0, 60)}...
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Right: Actions */}
                            {app.tailored_resume && (
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={() => handleCopyLatex(app.id, app.tailored_resume!.content_tex)}
                                        className="h-10 px-4 border-2 border-black text-xs font-mono uppercase tracking-wider hover:bg-black hover:text-white transition-colors flex items-center gap-2"
                                    >
                                        {copiedId === app.id ? (
                                            <><CheckIcon className="w-3 h-3" /> Copied</>
                                        ) : (
                                            <><CopyIcon className="w-3 h-3" /> LaTeX</>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleDownloadTex(app)}
                                        className="h-10 px-4 border-2 border-black bg-black text-white text-xs font-mono uppercase tracking-wider hover:bg-black/80 transition-colors flex items-center gap-2"
                                    >
                                        <DownloadIcon className="w-3 h-3" /> .TEX
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* LaTeX Preview (collapsed) */}
                        {app.tailored_resume && (
                            <details className="mt-4">
                                <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest opacity-40 hover:opacity-70">
                                    Preview LaTeX Source
                                </summary>
                                <pre className="mt-2 p-4 bg-[#F4F4F0] border border-black/10 text-[10px] font-mono overflow-x-auto max-h-64 overflow-y-auto">
                                    {app.tailored_resume.content_tex.substring(0, 2000)}
                                    {app.tailored_resume.content_tex.length > 2000 && '\n\n... (truncated)'}
                                </pre>
                            </details>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
