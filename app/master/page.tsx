'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const STORAGE_KEYS = {
    masterResume: 'jobops_master_resume',
    skillsBank: 'jobops_skills_bank',
}

const SAMPLE_LATEX = `\\documentclass[11pt]{article}
\\usepackage[margin=0.5in]{geometry}
\\usepackage{enumitem}
\\setlist{nosep}

\\begin{document}

\\begin{center}
{\\LARGE \\textbf{Your Name}} \\\\
your.email@example.com | (555) 555-5555 | linkedin.com/in/yourname | github.com/yourname
\\end{center}

\\section*{Experience}
\\textbf{Software Engineer} \\hfill Company Name \\\\
\\textit{Jan 2024 -- Present} \\hfill Location

\\begin{itemize}
\\item Developed and maintained full-stack web applications using React, Node.js, and PostgreSQL, resulting in a 30\\% improvement in page load times and a 15\\% increase in user engagement metrics across the platform.
\\item Designed and implemented RESTful API endpoints serving 10,000+ daily active users, incorporating rate limiting, caching strategies, and comprehensive error handling to maintain 99.9\\% uptime across all production services.
\\end{itemize}

\\section*{Education}
\\textbf{Bachelor of Science in Computer Science} \\hfill University Name \\\\
\\textit{Graduated May 2023} \\hfill GPA: 3.8/4.0

\\section*{Skills}
\\textbf{Languages:} Python, TypeScript, Java, SQL \\\\
\\textbf{Frameworks:} React, Next.js, Node.js, Django \\\\
\\textbf{Tools:} Docker, AWS, Git, PostgreSQL

\\end{document}`

export default function MasterBenchPage() {
    const [masterResume, setMasterResume] = useState('')
    const [skillsBank, setSkillsBank] = useState('')
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
    const [mounted, setMounted] = useState(false)

    // Load from localStorage on mount
    useEffect(() => {
        const savedResume = localStorage.getItem(STORAGE_KEYS.masterResume)
        const savedSkills = localStorage.getItem(STORAGE_KEYS.skillsBank)
        setMasterResume(savedResume || SAMPLE_LATEX)
        setSkillsBank(savedSkills || '')
        setMounted(true)
    }, [])

    // Auto-save with debounce
    const save = useCallback(() => {
        setSaveStatus('saving')
        localStorage.setItem(STORAGE_KEYS.masterResume, masterResume)
        localStorage.setItem(STORAGE_KEYS.skillsBank, skillsBank)
        setTimeout(() => setSaveStatus('saved'), 200)
        setTimeout(() => setSaveStatus('idle'), 2000)
    }, [masterResume, skillsBank])

    useEffect(() => {
        if (!mounted) return
        const timer = setTimeout(save, 800)
        return () => clearTimeout(timer)
    }, [masterResume, skillsBank, mounted, save])

    const charCount = masterResume.length
    const lineCount = masterResume.split('\n').length

    return (
        <div className="h-screen w-full flex flex-col bg-[#0a0a0a] text-white font-mono">
            {/* Header */}
            <header className="h-14 border-b border-white/10 flex items-center px-6 justify-between shrink-0 bg-[#0a0a0a]">
                <div className="flex items-center gap-4">
                    <Link href="/jobs" className="text-white/40 hover:text-white transition-colors text-sm">
                        ← JOBS
                    </Link>
                    <span className="text-white/10">|</span>
                    <h1 className="text-lg font-bold tracking-tight">MASTER BENCH</h1>
                    <span className="text-white/10">|</span>
                    <Link href="/tailor" className="text-white/40 hover:text-white transition-colors text-sm">
                        TAILOR →
                    </Link>
                </div>
                <div className="flex items-center gap-4">
                    <span className={`text-xs transition-opacity duration-300 ${saveStatus === 'saved' ? 'text-emerald-400 opacity-100' :
                            saveStatus === 'saving' ? 'text-amber-400 opacity-100' :
                                'opacity-0'
                        }`}>
                        {saveStatus === 'saved' ? '✓ Saved to LocalStorage' : saveStatus === 'saving' ? 'Saving...' : ''}
                    </span>
                    <span className="text-xs text-white/30">
                        {lineCount} lines · {charCount.toLocaleString()} chars
                    </span>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Master Resume Editor — 65% */}
                <div className="flex-[65] flex flex-col border-r border-white/10">
                    <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                        <span className="text-xs text-white/50 tracking-wider">MASTER RESUME (LaTeX)</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(masterResume)
                                    setSaveStatus('saved')
                                }}
                                className="px-3 py-1 text-xs border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors"
                            >
                                COPY
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm('Load sample LaTeX template? This will replace your current content.')) {
                                        setMasterResume(SAMPLE_LATEX)
                                    }
                                }}
                                className="px-3 py-1 text-xs border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors"
                            >
                                LOAD TEMPLATE
                            </button>
                        </div>
                    </div>
                    <textarea
                        value={masterResume}
                        onChange={(e) => setMasterResume(e.target.value)}
                        className="flex-1 w-full bg-transparent text-sm text-white/90 p-4 resize-none focus:outline-none font-mono leading-relaxed placeholder:text-white/20"
                        placeholder="Paste your master LaTeX resume here..."
                        spellCheck={false}
                    />
                </div>

                {/* Skills Bank — 35% */}
                <div className="flex-[35] flex flex-col">
                    <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                        <span className="text-xs text-white/50 tracking-wider">SKILLS BANK</span>
                        <span className="text-xs text-white/30">
                            {skillsBank ? skillsBank.split('\n').filter(l => l.trim()).length : 0} entries
                        </span>
                    </div>
                    <textarea
                        value={skillsBank}
                        onChange={(e) => setSkillsBank(e.target.value)}
                        className="flex-1 w-full bg-transparent text-sm text-white/90 p-4 resize-none focus:outline-none font-mono leading-relaxed placeholder:text-white/20"
                        placeholder={`Dump raw skills, projects, and experience here.\nThe AI will pull relevant items to fill gaps.\n\nExamples:\n- Built CI/CD pipeline with GitHub Actions & ArgoCD\n- Kubernetes cluster management (EKS, 200+ pods)\n- Real-time data streaming with Apache Kafka\n- gRPC microservices in Go\n- Led migration from monolith to microservices (18 months)\n- Published 3 npm packages (10k+ weekly downloads)`}
                        spellCheck={false}
                    />
                </div>
            </div>
        </div>
    )
}
