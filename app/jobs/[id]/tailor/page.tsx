'use client'

import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"
import { PDFViewer } from "@/components/resume/pdf-viewer"
import { GapAnalysis } from "@/components/resume/gap-analysis"
import { Button } from "@/components/ui/button"
import { useState, use } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatInterface } from "@/components/resume/chat-interface"
import Link from "next/link"

// Mock Data
const MOCK_GAP_DATA = {
    gaps: [
        {
            skill: "Rust",
            project_name: "High-Performance CLI Tool",
            project_description: "Build a multithreaded file searcher (grep clone) to demonstrate memory safety and concurrency."
        },
        {
            skill: "Kubernetes",
            project_name: "Self-Healing Cluster Demo",
            project_description: "Deploy a simple Node.js app with Minikube, configured with Liveness probes to restart on simulated failure."
        }
    ]
}

// Mock Job Description
const MOCK_JOB = {
    title: "Senior Frontend Engineer",
    company: "TechCorp",
    location: "Remote",
    description: `We are looking for a Senior Frontend Engineer to join our team and help build the next generation of our product.

RESPONSIBILITIES
- Design and implement user interfaces using React and TypeScript
- Collaborate with designers and backend engineers
- Optimize application performance
- Mentor junior developers

REQUIREMENTS
- 5+ years of experience with React
- Strong TypeScript skills
- Experience with Next.js and modern CSS
- Familiarity with testing frameworks

NICE TO HAVE
- Experience with Rust or WebAssembly
- Kubernetes deployment experience
- Open source contributions`,
    tech_stack: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
    yoe: 5,
    tc_range: "$180k - $220k",
    posted_date: "2026-01-25"
}

type ViewType = 'job' | 'master' | 'tailored' | 'diff'

export default function ResumeTailorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [activeView, setActiveView] = useState<ViewType>('job')

    const PDF_URLS: Record<string, string | null> = {
        master: null,
        tailored: null,
        diff: null
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
                        <span className="font-semibold">{MOCK_JOB.title}</span>
                        <span className="opacity-40"> @ {MOCK_JOB.company}</span>
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
                                            <h1 className="text-2xl font-bold mb-1">{MOCK_JOB.title}</h1>
                                            <p className="opacity-60 mb-4">{MOCK_JOB.company} · {MOCK_JOB.location}</p>

                                            <div className="flex gap-6 text-sm">
                                                <div>
                                                    <span className="opacity-40">COMPENSATION</span>
                                                    <div className="font-semibold">{MOCK_JOB.tc_range}</div>
                                                </div>
                                                <div>
                                                    <span className="opacity-40">EXPERIENCE</span>
                                                    <div className="font-semibold">{MOCK_JOB.yoe}+ years</div>
                                                </div>
                                                <div>
                                                    <span className="opacity-40">POSTED</span>
                                                    <div className="font-semibold">{MOCK_JOB.posted_date}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tech Stack */}
                                        <div className="mb-8">
                                            <div className="text-xs opacity-40 mb-2">REQUIRED SKILLS</div>
                                            <div className="flex flex-wrap gap-2">
                                                {MOCK_JOB.tech_stack.map(tech => (
                                                    <span
                                                        key={tech}
                                                        className="px-3 py-1 border border-black/30 text-sm"
                                                    >
                                                        {tech}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <div className="whitespace-pre-wrap text-sm leading-relaxed opacity-80">
                                            {MOCK_JOB.description}
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
                                    <div className="text-xs opacity-40 mb-4 tracking-wider">SKILL GAPS</div>
                                    <div className="space-y-4">
                                        {MOCK_GAP_DATA.gaps.map((gap, i) => (
                                            <div key={i} className="border border-black/20 p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="px-2 py-0.5 bg-black text-white text-xs">
                                                        MISSING
                                                    </span>
                                                    <span className="font-semibold">{gap.skill}</span>
                                                </div>
                                                <div className="text-sm mb-1 font-medium">{gap.project_name}</div>
                                                <div className="text-xs opacity-60">{gap.project_description}</div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Chat */}
                                <section>
                                    <div className="text-xs opacity-40 mb-4 tracking-wider">AI CAREER COACH</div>
                                    <ChatInterface />
                                </section>
                            </div>
                        </ScrollArea>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    )
}
