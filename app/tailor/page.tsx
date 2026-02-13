'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"

const STORAGE_KEYS = {
    masterResume: 'jobops_master_resume',
    skillsBank: 'jobops_skills_bank',
}

type TailorStatus = 'idle' | 'scraping' | 'tailoring' | 'done' | 'error'

interface KeywordAnalysis {
    jd_keywords: string[]
    used_keywords: string[]
    missing_keywords: string[]
    swapped_terms: Array<{ original: string; replaced_with: string }>
}

type RightPanelView = 'diff' | 'keywords'

export default function TailorWorkspacePage() {
    const [jobLink, setJobLink] = useState('')
    const [jobReqId, setJobReqId] = useState('')
    const [jobDescription, setJobDescription] = useState('')
    const [masterResume, setMasterResume] = useState('')
    const [skillsBank, setSkillsBank] = useState('')
    const [tailoredLatex, setTailoredLatex] = useState('')
    const [keywordAnalysis, setKeywordAnalysis] = useState<KeywordAnalysis | null>(null)
    const [persisted, setPersisted] = useState(false)
    const [status, setStatus] = useState<TailorStatus>('idle')
    const [errorMsg, setErrorMsg] = useState('')
    const [scrapeStatus, setScrapeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [rightPanel, setRightPanel] = useState<RightPanelView>('diff')
    const editorRef = useRef<HTMLTextAreaElement>(null)

    // Load master resume and skills from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.masterResume)
        const skills = localStorage.getItem(STORAGE_KEYS.skillsBank)
        if (saved) setMasterResume(saved)
        if (skills) setSkillsBank(skills)
    }, [])

    // Scrape job link
    const handleScrape = async () => {
        if (!jobLink.trim()) return
        setScrapeStatus('loading')
        setErrorMsg('')
        try {
            const res = await fetch('/api/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: jobLink }),
            })
            const data = await res.json()
            if (res.ok && data.text) {
                setJobDescription(data.text)
                setScrapeStatus('success')
            } else {
                setScrapeStatus('error')
                setErrorMsg(data.error || 'Failed to scrape. Paste the description manually.')
            }
        } catch {
            setScrapeStatus('error')
            setErrorMsg('Network error. Paste the description manually.')
        }
    }

    // Tailor resume
    const handleTailor = async () => {
        if (!jobDescription.trim()) {
            setErrorMsg('Please provide a job description.')
            return
        }
        if (!masterResume.trim()) {
            setErrorMsg('No master resume found. Visit /master to set it up.')
            return
        }

        setStatus('tailoring')
        setErrorMsg('')
        setTailoredLatex('')
        setKeywordAnalysis(null)
        setPersisted(false)

        try {
            const res = await fetch('/api/tailor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_description: jobDescription,
                    current_latex_code: masterResume,
                    skills_bank_text: skillsBank,
                    job_req_id: jobReqId || undefined,
                }),
            })
            const data = await res.json()
            if (res.ok && data.tailored_latex) {
                setTailoredLatex(data.tailored_latex)
                setKeywordAnalysis(data.keyword_analysis || null)
                setPersisted(data.persisted || false)
                setStatus('done')
                // Auto-switch to keywords if we have analysis
                if (data.keyword_analysis) {
                    setRightPanel('keywords')
                }
            } else {
                setStatus('error')
                setErrorMsg(data.error || 'Tailoring failed.')
            }
        } catch {
            setStatus('error')
            setErrorMsg('Network error during tailoring.')
        }
    }

    // Copy to clipboard
    const handleCopy = () => {
        const text = tailoredLatex || masterResume
        navigator.clipboard.writeText(text)
    }

    // Download .tex file
    const handleDownload = () => {
        const text = tailoredLatex || masterResume
        const blob = new Blob([text], { type: 'text/x-tex' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = jobReqId ? `resume_${jobReqId}.tex` : 'tailored_resume.tex'
        a.click()
        URL.revokeObjectURL(url)
    }

    // Simple diff: highlight lines that differ
    const computeDiff = () => {
        if (!masterResume || !tailoredLatex) return null
        const originalLines = masterResume.split('\n')
        const tailoredLines = tailoredLatex.split('\n')
        const maxLen = Math.max(originalLines.length, tailoredLines.length)
        const diff: Array<{ type: 'same' | 'added' | 'removed' | 'changed'; original?: string; tailored?: string }> = []

        for (let i = 0; i < maxLen; i++) {
            const orig = originalLines[i]
            const tail = tailoredLines[i]
            if (orig === tail) {
                diff.push({ type: 'same', original: orig, tailored: tail })
            } else if (orig === undefined) {
                diff.push({ type: 'added', tailored: tail })
            } else if (tail === undefined) {
                diff.push({ type: 'removed', original: orig })
            } else {
                diff.push({ type: 'changed', original: orig, tailored: tail })
            }
        }
        return diff
    }

    const diff = computeDiff()
    const matchRate = keywordAnalysis
        ? Math.round((keywordAnalysis.used_keywords.length / Math.max(keywordAnalysis.jd_keywords.length, 1)) * 100)
        : 0

    return (
        <div className="h-screen w-full flex flex-col bg-[#0a0a0a] text-white font-mono">
            {/* Header */}
            <header className="h-14 border-b border-white/10 flex items-center px-6 justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/jobs" className="text-white/40 hover:text-white transition-colors text-sm">
                        ← JOBS
                    </Link>
                    <span className="text-white/10">|</span>
                    <Link href="/master" className="text-white/40 hover:text-white transition-colors text-sm">
                        MASTER BENCH
                    </Link>
                    <span className="text-white/10">|</span>
                    <h1 className="text-lg font-bold tracking-tight">TAILOR WORKSPACE</h1>
                </div>
                <div className="flex items-center gap-3">
                    {persisted && (
                        <span className="text-xs text-emerald-400/80">● Saved to DB</span>
                    )}
                    <button
                        onClick={handleCopy}
                        className="px-4 py-2 text-xs border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors"
                    >
                        COPY LaTeX
                    </button>
                    <button
                        onClick={handleDownload}
                        className="px-4 py-2 text-xs border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors"
                    >
                        DOWNLOAD .tex
                    </button>
                </div>
            </header>

            {/* Job Ingest Bar */}
            <div className="border-b border-white/10 px-6 py-4 bg-white/[0.02]">
                <div className="flex gap-4 items-end">
                    {/* Job Req ID */}
                    <div className="w-40">
                        <label className="text-xs text-white/40 tracking-wider block mb-1.5">JOB REQ ID</label>
                        <input
                            type="text"
                            value={jobReqId}
                            onChange={(e) => setJobReqId(e.target.value)}
                            placeholder="REQ-12345"
                            className="w-full bg-white/5 border border-white/10 px-3 py-2 text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 transition-colors"
                        />
                    </div>

                    {/* Job Link */}
                    <div className="flex-[2]">
                        <label className="text-xs text-white/40 tracking-wider block mb-1.5">JOB LINK (URL)</label>
                        <div className="flex gap-2">
                            <input
                                type="url"
                                value={jobLink}
                                onChange={(e) => setJobLink(e.target.value)}
                                placeholder="https://jobs.example.com/listing/12345"
                                className="flex-1 bg-white/5 border border-white/10 px-3 py-2 text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
                            />
                            <button
                                onClick={handleScrape}
                                disabled={scrapeStatus === 'loading' || !jobLink.trim()}
                                className="px-4 py-2 text-xs bg-white/10 border border-white/20 text-white/70 hover:bg-white/20 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                                {scrapeStatus === 'loading' ? 'SCRAPING...' : 'FETCH JD'}
                            </button>
                        </div>
                        {scrapeStatus === 'success' && (
                            <span className="text-xs text-emerald-400 mt-1 block">✓ Job description fetched</span>
                        )}
                        {scrapeStatus === 'error' && (
                            <span className="text-xs text-amber-400 mt-1 block">⚠ {errorMsg || 'Scrape failed — paste manually below'}</span>
                        )}
                    </div>

                    {/* Tailor Button */}
                    <div>
                        <button
                            onClick={handleTailor}
                            disabled={status === 'tailoring' || !jobDescription.trim()}
                            className="px-6 py-2 text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-600/20"
                        >
                            {status === 'tailoring' ? '⏳ TAILORING...' : '✨ TAILOR TO JOB'}
                        </button>
                    </div>
                </div>

                {/* Job Description Textarea */}
                <div className="mt-3">
                    <label className="text-xs text-white/40 tracking-wider block mb-1.5">JOB DESCRIPTION</label>
                    <textarea
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        rows={4}
                        placeholder="Paste the full job description here, or use FETCH JD above..."
                        className="w-full bg-white/5 border border-white/10 px-3 py-2 text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors resize-y font-mono"
                        spellCheck={false}
                    />
                </div>

                {/* Status Messages */}
                {status === 'error' && errorMsg && (
                    <div className="mt-2 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                        {errorMsg}
                    </div>
                )}
                {status === 'done' && (
                    <div className="mt-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-3">
                        <span>✓ Resume tailored successfully.</span>
                        {keywordAnalysis && (
                            <span className="text-emerald-300/80">
                                Keyword match: {matchRate}% ({keywordAnalysis.used_keywords.length}/{keywordAnalysis.jd_keywords.length})
                            </span>
                        )}
                        {persisted && <span className="text-emerald-300/60">· Saved to database</span>}
                    </div>
                )}
                {!masterResume && (
                    <div className="mt-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                        ⚠ No master resume found. <Link href="/master" className="underline hover:text-amber-300">Set one up first →</Link>
                    </div>
                )}
            </div>

            {/* Split View Workspace */}
            <ResizablePanelGroup orientation="horizontal" className="flex-1">
                {/* Left Pane: LaTeX Editor */}
                <ResizablePanel defaultSize={50} minSize={30}>
                    <div className="h-full flex flex-col">
                        <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                            <span className="text-xs text-white/50 tracking-wider">
                                {tailoredLatex ? 'TAILORED LaTeX' : 'MASTER LaTeX (READ-ONLY)'}
                            </span>
                            <span className="text-xs text-white/30">
                                {(tailoredLatex || masterResume).split('\n').length} lines
                            </span>
                        </div>
                        <textarea
                            ref={editorRef}
                            value={tailoredLatex || masterResume}
                            onChange={(e) => {
                                if (tailoredLatex) setTailoredLatex(e.target.value)
                            }}
                            readOnly={!tailoredLatex}
                            className="flex-1 w-full bg-transparent text-sm text-white/90 p-4 resize-none focus:outline-none font-mono leading-relaxed placeholder:text-white/20"
                            spellCheck={false}
                        />
                    </div>
                </ResizablePanel>

                <ResizableHandle className="w-px bg-white/10 hover:bg-violet-500/50 transition-colors data-[resize-handle-active]:bg-violet-500" />

                {/* Right Pane: Diff View + Keyword Analysis */}
                <ResizablePanel defaultSize={50} minSize={25}>
                    <div className="h-full flex flex-col">
                        {/* Right Panel Tabs */}
                        <div className="px-4 py-2 border-b border-white/10 bg-white/[0.02] flex items-center gap-4">
                            <button
                                onClick={() => setRightPanel('diff')}
                                className={`text-xs tracking-wider transition-colors ${rightPanel === 'diff' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
                            >
                                DIFF VIEW
                            </button>
                            <button
                                onClick={() => setRightPanel('keywords')}
                                className={`text-xs tracking-wider transition-colors flex items-center gap-1.5 ${rightPanel === 'keywords' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
                            >
                                KEYWORD ANALYSIS
                                {keywordAnalysis && (
                                    <span className={`px-1.5 py-0.5 text-[10px] rounded-sm ${matchRate >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
                                            matchRate >= 50 ? 'bg-amber-500/20 text-amber-400' :
                                                'bg-red-500/20 text-red-400'
                                        }`}>
                                        {matchRate}%
                                    </span>
                                )}
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-4">
                            {rightPanel === 'diff' ? (
                                /* ===== DIFF VIEW ===== */
                                !tailoredLatex ? (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="text-center text-white/30 space-y-2">
                                            <div className="text-4xl">📄</div>
                                            <div className="text-sm">No diff yet</div>
                                            <div className="text-xs text-white/20 max-w-xs">
                                                Paste a job description and click &quot;✨ Tailor to Job&quot; to see the AI-generated changes highlighted here.
                                            </div>
                                        </div>
                                    </div>
                                ) : status === 'tailoring' ? (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="text-center text-white/40 space-y-3">
                                            <div className="text-3xl animate-spin">⚙️</div>
                                            <div className="text-sm">Tailoring in progress...</div>
                                            <div className="text-xs text-white/20">The AI is rewriting your resume with Dense-Compact formatting</div>
                                        </div>
                                    </div>
                                ) : diff ? (
                                    <div className="text-xs font-mono space-y-0">
                                        {diff.map((line, i) => (
                                            <div key={i} className="flex">
                                                <span className="w-10 shrink-0 text-white/20 text-right pr-2 select-none">{i + 1}</span>
                                                {line.type === 'same' && (
                                                    <span className="text-white/50 leading-relaxed">{line.original || ' '}</span>
                                                )}
                                                {line.type === 'removed' && (
                                                    <span className="text-red-400/80 bg-red-500/10 leading-relaxed block w-full px-1">
                                                        <span className="text-red-500/60 mr-1">-</span>{line.original}
                                                    </span>
                                                )}
                                                {line.type === 'added' && (
                                                    <span className="text-emerald-400/80 bg-emerald-500/10 leading-relaxed block w-full px-1">
                                                        <span className="text-emerald-500/60 mr-1">+</span>{line.tailored}
                                                    </span>
                                                )}
                                                {line.type === 'changed' && (
                                                    <div className="w-full space-y-0">
                                                        <div className="text-red-400/80 bg-red-500/10 leading-relaxed px-1">
                                                            <span className="text-red-500/60 mr-1">-</span>{line.original}
                                                        </div>
                                                        <div className="text-emerald-400/80 bg-emerald-500/10 leading-relaxed px-1">
                                                            <span className="text-emerald-500/60 mr-1">+</span>{line.tailored}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : null
                            ) : (
                                /* ===== KEYWORD ANALYSIS VIEW ===== */
                                !keywordAnalysis ? (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="text-center text-white/30 space-y-2">
                                            <div className="text-4xl">🔍</div>
                                            <div className="text-sm">No keyword data yet</div>
                                            <div className="text-xs text-white/20 max-w-xs">
                                                Tailor a resume to see which JD keywords were matched and which are missing.
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Match Rate Header */}
                                        <div className="text-center pb-4 border-b border-white/10">
                                            <div className={`text-4xl font-bold ${matchRate >= 80 ? 'text-emerald-400' :
                                                    matchRate >= 50 ? 'text-amber-400' :
                                                        'text-red-400'
                                                }`}>
                                                {matchRate}%
                                            </div>
                                            <div className="text-xs text-white/40 mt-1">
                                                ATS KEYWORD MATCH RATE
                                            </div>
                                            <div className="text-xs text-white/30 mt-0.5">
                                                {keywordAnalysis.used_keywords.length} of {keywordAnalysis.jd_keywords.length} keywords matched
                                            </div>
                                        </div>

                                        {/* Used Keywords */}
                                        <div>
                                            <div className="text-xs text-emerald-400/60 tracking-wider mb-2 flex items-center gap-2">
                                                <span>✓ MATCHED KEYWORDS</span>
                                                <span className="text-white/20">({keywordAnalysis.used_keywords.length})</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {keywordAnalysis.used_keywords.map((kw, i) => (
                                                    <span key={i} className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                                                        {kw}
                                                    </span>
                                                ))}
                                                {keywordAnalysis.used_keywords.length === 0 && (
                                                    <span className="text-xs text-white/20">None matched</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Missing Keywords */}
                                        <div>
                                            <div className="text-xs text-red-400/60 tracking-wider mb-2 flex items-center gap-2">
                                                <span>✗ MISSING KEYWORDS</span>
                                                <span className="text-white/20">({keywordAnalysis.missing_keywords.length})</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {keywordAnalysis.missing_keywords.map((kw, i) => (
                                                    <span key={i} className="px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                                                        {kw}
                                                    </span>
                                                ))}
                                                {keywordAnalysis.missing_keywords.length === 0 && (
                                                    <span className="text-xs text-emerald-400/60">All keywords covered! 🎯</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Swapped Terms */}
                                        {keywordAnalysis.swapped_terms.length > 0 && (
                                            <div>
                                                <div className="text-xs text-violet-400/60 tracking-wider mb-2 flex items-center gap-2">
                                                    <span>⇄ ATS TERM SWAPS</span>
                                                    <span className="text-white/20">({keywordAnalysis.swapped_terms.length})</span>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {keywordAnalysis.swapped_terms.map((swap, i) => (
                                                        <div key={i} className="flex items-center gap-2 text-xs px-2 py-1.5 bg-violet-500/5 border border-violet-500/10">
                                                            <span className="text-red-400/60 line-through">{swap.original}</span>
                                                            <span className="text-white/20">→</span>
                                                            <span className="text-violet-400">{swap.replaced_with}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* All JD Keywords */}
                                        <div className="pt-4 border-t border-white/10">
                                            <div className="text-xs text-white/30 tracking-wider mb-2">
                                                ALL JD KEYWORDS ({keywordAnalysis.jd_keywords.length})
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {keywordAnalysis.jd_keywords.map((kw, i) => {
                                                    const isUsed = keywordAnalysis.used_keywords.includes(kw)
                                                    return (
                                                        <span key={i} className={`px-2 py-0.5 text-[10px] border ${isUsed
                                                                ? 'border-emerald-500/20 text-emerald-400/60 bg-emerald-500/5'
                                                                : 'border-red-500/20 text-red-400/60 bg-red-500/5'
                                                            }`}>
                                                            {isUsed ? '✓' : '✗'} {kw}
                                                        </span>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    )
}
