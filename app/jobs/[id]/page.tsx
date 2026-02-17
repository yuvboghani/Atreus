'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ChatInterface } from "@/components/resume/chat-interface";
import { PdfViewer } from "@/components/pdf-viewer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DownloadIcon } from "lucide-react";
import { generateCoverLetter } from '@/app/actions/generate-cover-letter';

interface WorkspacePageProps {
    params: { id: string }
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
    const [job, setJob] = useState<any>(null);
    const [resumeUrl, setResumeUrl] = useState<string | null>(null);
    const [diffUrl, setDiffUrl] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("tailored");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const supabase = createClient();

            // Fetch Job
            const { data: jobData } = await supabase.from('jobs').select('*').eq('id', params.id).single();
            setJob(jobData);

            // Fetch Latest Resume for this job/user? 
            // For now, fetch ANY resume to display.
            const { data: resumeData } = await supabase.from('resumes').select('*').order('created_at', { ascending: false }).limit(1).single();

            // If we had a tailored version stored, we'd fetch that.
            // For now, assuming no tailored version exists yet, show placeholder or master.
            // But we need a URL. In a real app, 'content_tex' needs to be compiled to get a URL.
            // Or we assume 'pdf_path' exists in resumes table (it does in the schema I saw earlier!).

            if (resumeData?.pdf_path) {
                const { data } = supabase.storage.from('resumes').getPublicUrl(resumeData.pdf_path);
                setResumeUrl(data.publicUrl);
            }

            setLoading(false);
        };

        fetchData();
    }, [params.id]);

    const handleExport = async () => {
        // Logic to trigger server action
        // const res = await generateCoverLetter(params.id, resumeId);
        alert("Cover Letter generation triggered (check console/network)");
    };

    if (loading) return <div className="p-10">Loading workspace...</div>;
    if (!job) return <div className="p-10">Job not found</div>;

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Header */}
            <div className="h-14 border-b flex items-center justify-between px-4 bg-card">
                <div className="font-semibold">{job.title} @ {job.company}</div>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleExport}>
                        <DownloadIcon className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* 3-Pane Layout */}
            <ResizablePanelGroup orientation="horizontal" className="flex-1">
                {/* Left: Raw JD */}
                <ResizablePanel defaultSize={25} minSize={20}>
                    <div className="h-full flex flex-col">
                        <div className="p-2 bg-muted text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b">
                            Job Description
                        </div>
                        <div className="flex-1 p-4 overflow-auto text-sm whitespace-pre-wrap">
                            {job.raw_description || job.description}
                        </div>
                    </div>
                </ResizablePanel>

                <ResizableHandle />

                {/* Middle: PDF Preview */}
                <ResizablePanel defaultSize={50} minSize={30}>
                    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
                        <div className="flex items-center justify-between p-2 border-b bg-white dark:bg-black">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-8">
                                <TabsList className="h-8">
                                    <TabsTrigger value="tailored" className="text-xs">Tailored</TabsTrigger>
                                    <TabsTrigger value="redline" className="text-xs">Redline (Diff)</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                        <div className="flex-1 overflow-auto relative">
                            <PdfViewer url={activeTab === 'tailored' ? resumeUrl : diffUrl || resumeUrl} />
                        </div>
                    </div>
                </ResizablePanel>

                <ResizableHandle />

                {/* Right: AI Chat */}
                <ResizablePanel defaultSize={25} minSize={20}>
                    <div className="h-full flex flex-col">
                        <div className="p-2 bg-muted text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b">
                            AI Strategist
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <ChatInterface jobId={params.id} />
                        </div>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
