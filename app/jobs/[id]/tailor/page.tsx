'use client'

import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"
import { PDFViewer } from "@/components/resume/pdf-viewer"
import { GapAnalysis } from "@/components/resume/gap-analysis"
import { useState, use, useEffect, useCallback } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatInterface } from "@/components/resume/chat-interface"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Job } from "@/types"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type ViewType = 'job' | 'master' | 'tailored' | 'diff'

export default function ResumeTailorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [activeView, setActiveView] = useState<ViewType>('job')
    const [job, setJob] = useState<Job | null>(null)
    const [loading, setLoading] = useState(true)
    const [analyzing, setAnalyzing] = useState(false)
    const supabase = createClient()

    const PDF_URLS: Record<string, string | null> = {
        master: null, // to be populated
        tailored: null,
        diff: null
    }

    const fetchJob = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('jobs')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            setJob(data)
        } catch (error) {
            console.error('Error fetching job:', error)
        } finally {
            setLoading(false)
        }
    }, [id, supabase])

    useEffect(() => {
        fetchJob()
    }, [fetchJob])

    const handleRunAnalysis = async () => {
        if (!job) return
        setAnalyzing(true)
        try {
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ job_id: job.id })
            })
            const data = await res.json()
            if (res.ok) {
                // Refresh job to get new analysis
                fetchJob()
            } else {
                console.error("Analysis failed", data.error)
            }
        } catch (e) {
            console.error("Analysis error", e)
        } finally {
            setAnalyzing(false)
        }
    }

    const handleGenerateCoverLetter = async () => {
        alert("Cover letter generation triggered. Configure webhook URL in production.")
    }

    const tabs: { key: ViewType; label: string }[] = [
        { key: 'job', label: 'JOB DESCRIPTION' },
        { key: 'master', label: 'MASTER RESUME' },
        { key: 'tailored', label: 'AI TAILORED' },
        { key: 'diff', label: 'DIFF VIEW' },
    ]

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-white text-black font-mono">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin opacity-40" />
                    <div className="text-sm opacity-60">LOADING MISSION DATA...</div>
                </div>
            </div>
        )
    }

    if (!job) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-white text-black font-mono">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">JOB NOT FOUND</h1>
                    <Link href="/jobs" className="text-sm underline hover:opacity-60">Return to Job Board</Link>
                </div>
            </div>
        )
    }

    // Helper to get nested metadata safely
    const meta = job.metadata || {}
    const techStack = meta.tech_stack || []

    return (
        <div className="h-screen w-full flex flex-col bg-white text-black font-mono">
            {/* Header */}
            <header className="h-14 border-b-2 border-black flex items-center px-6 justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/jobs" className="opacity-40 hover:opacity-100 transition-opacity">
                        ← BACK
                    </Link>
                    <span className="opacity-20">|</span>
                    <div>
                        <span className="font-semibold">{job.title}</span>
                        <span className="opacity-40"> @ {job.company}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleGenerateCoverLetter}
                        className="px-4 py-2 border border-black/30 text-sm hover:bg-black hover:text-white transition-colors"
                    >
                        GENERATE COVER LETTER
                    </button>
                    <button className="px-4 py-2 bg-black text-white text-sm hover:bg-black/80 transition-colors">
                        SAVE & DOWNLOAD
                    </button>
                </div>
            </header>

            {/* Tab Bar */}
            <div className="border-b border-black/20 flex">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveView(tab.key)}
                        className={`px-6 py-3 text-xs tracking-wider border-r border-black/10 transition-colors ${activeView === tab.key
                            ? 'bg-black text-white'
                            : 'hover:bg-black/5'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Main Workspace */}
            <ResizablePanelGroup orientation="horizontal" className="flex-1">
                <ResizablePanel defaultSize={60} minSize={30}>
                    <div className="h-full flex flex-col">
                        {/* Content Area */}
                        <div className="flex-1 overflow-hidden">
                            {activeView === 'job' ? (
                                <ScrollArea className="h-full">
                                    <div className="p-8 max-w-3xl">
                                        {/* Job Header */}
                                        <div className="mb-8 pb-6 border-b border-black/20">
                                            <h1 className="text-2xl font-bold mb-1">{job.title}</h1>
                                            <p className="opacity-60 mb-4">{job.company} · {meta.location || 'Remote'}</p>

                                            <div className="flex gap-6 text-sm">
                                                <div>
                                                    <span className="opacity-40">COMPENSATION</span>
                                                    <div className="font-semibold">
                                                        {meta.tc_min ? `$${meta.tc_min}k` : '???'} - {meta.tc_max ? `$${meta.tc_max}k` : '???'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="opacity-40">EXPERIENCE</span>
                                                    <div className="font-semibold">{meta.yoe || 0}+ years</div>
                                                </div>
                                                <div>
                                                    <span className="opacity-40">POSTED</span>
                                                    <div className="font-semibold">{meta.posted_date || 'Recently'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tech Stack */}
                                        {techStack.length > 0 && (
                                            <div className="mb-8">
                                                <div className="text-xs opacity-40 mb-2">REQUIRED SKILLS</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {techStack.map((tech: string) => (
                                                        <span
                                                            key={tech}
                                                            className="px-3 py-1 border border-black/30 text-sm"
                                                        >
                                                            {tech}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Description */}
                                        <div className="whitespace-pre-wrap text-sm leading-relaxed opacity-80">
                                            {job.raw_description || 'No description available.'}
                                        </div>
                                    </div>
                                </ScrollArea>
                            ) : (
                                <PDFViewer url={PDF_URLS[activeView]} />
                            )}
                        </div>
                    </div>
                </ResizablePanel>

                <ResizableHandle className="w-px bg-black/20 hover:bg-black transition-colors" />

                <ResizablePanel defaultSize={40} minSize={25}>
                    <div className="h-full flex flex-col border-l border-black/10">
                        <ScrollArea className="h-full">
                            <div className="p-6 space-y-8">
                                {/* Gap Analysis */}
                                <section>
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="text-xs opacity-40 tracking-wider">SKILL GAPS</div>
                                        {analyzing && <Loader2 className="w-3 h-3 animate-spin" />}
                                    </div>

                                    {job.gap_analysis && job.gap_analysis.gaps ? (
                                        <GapAnalysis data={job.gap_analysis} />
                                    ) : (
                                        <div className="text-center p-8 border border-dashed border-black/20">
                                            <div className="text-sm opacity-60 mb-4">No analysis data found.</div>
                                            <Button
                                                onClick={handleRunAnalysis}
                                                disabled={analyzing}
                                                variant="outline"
                                                className="border-black/30 hover:bg-black hover:text-white"
                                            >
                                                {analyzing ? 'ANALYZING...' : 'RUN GAP ANALYSIS'}
                                            </Button>
                                        </div>
                                    )}
                                </section>

                                {/* Chat */}
                                <section>
                                    <div className="text-xs opacity-40 mb-4 tracking-wider">AI CAREER COACH</div>
                                    <ChatInterface jobId={job.id} />
                                </section>
                            </div>
                        </ScrollArea>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    )
}
