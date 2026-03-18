'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface IntelModalProps {
    job: {
        id: string;
        title: string;
        company: string;
        match_score?: number;
        full_description_markdown?: string;
        raw_description?: string;
        key_priorities?: string[];
        tech_stack?: string[];
        salary_range?: string;
        remote_status?: string;
        metadata?: any;
    };
}

export function IntelModal({ job }: IntelModalProps) {
    const priorities = job.key_priorities
        || job.metadata?.key_priorities || [];
    const techStack = job.tech_stack
        || job.metadata?.tech_stack || [];
    const salary = job.salary_range
        || job.metadata?.salary_range || 'N/A';
    const remote = job.remote_status
        || job.metadata?.remote_status || 'unknown';
    const fullDesc = job.full_description_markdown
        || job.raw_description || '';

    return (
        <DialogPrimitive.Root>
            <DialogPrimitive.Trigger asChild>
                <button className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 border border-black/30 hover:bg-black hover:text-white transition-colors">
                    INTEL
                </button>
            </DialogPrimitive.Trigger>

            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <DialogPrimitive.Content className="fixed right-0 top-0 h-full w-full max-w-[600px] bg-[#F4F4F0] border-l-2 border-black z-50 overflow-y-auto p-8 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right">

                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight">
                                {job.title}
                            </h2>
                            <p className="font-mono text-sm opacity-60 mt-1">
                                {job.company}
                            </p>
                        </div>
                        <DialogPrimitive.Close className="p-1 hover:bg-black/10 transition-colors">
                            <X className="w-5 h-5" />
                        </DialogPrimitive.Close>
                    </div>

                    {/* Score + Status */}
                    <div className="flex gap-3 mb-6">
                        {job.match_score != null && (
                            <Badge className="bg-black text-white">
                                MATCH {job.match_score}%
                            </Badge>
                        )}
                        <Badge variant="outline" className="border-black/30 uppercase">
                            {remote}
                        </Badge>
                        {salary !== 'N/A' && (
                            <Badge variant="outline" className="border-black/30">
                                {salary}
                            </Badge>
                        )}
                    </div>

                    {/* Key Priorities */}
                    {priorities.length > 0 && (
                        <div className="mb-6">
                            <h3 className="font-mono text-xs uppercase tracking-widest opacity-60 mb-3">
                                INSIDE INTEL
                            </h3>
                            <ul className="space-y-2">
                                {priorities.map((p: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                        <span className="font-mono text-xs mt-0.5 opacity-40">{String(i + 1).padStart(2, '0')}</span>
                                        <span>{p}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Tech Stack */}
                    {techStack.length > 0 && (
                        <div className="mb-6">
                            <h3 className="font-mono text-xs uppercase tracking-widest opacity-60 mb-3">
                                TECH STACK
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {techStack.map((tech: string, i: number) => (
                                    <Badge key={i} variant="outline" className="border-black/30 text-xs">
                                        {tech}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Full Description */}
                    {fullDesc && (
                        <div className="mb-6">
                            <h3 className="font-mono text-xs uppercase tracking-widest opacity-60 mb-3">
                                FULL DESCRIPTION
                            </h3>
                            <div className="prose prose-sm max-w-none font-mono text-xs leading-relaxed whitespace-pre-wrap border border-black/10 p-4 bg-white max-h-[400px] overflow-y-auto">
                                {fullDesc}
                            </div>
                        </div>
                    )}

                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
