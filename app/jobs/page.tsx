'use client'

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Job } from "@/types"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { SearchIcon, XIcon, ArrowUpDownIcon } from "lucide-react"
import { createClient } from "@/utils/supabase/client"

type SortOption = 'date-desc' | 'date-asc' | 'tc-desc' | 'tc-asc' | 'yoe-asc' | 'yoe-desc'

export default function JobBoardPage() {
    const [search, setSearch] = useState("")
    const [status, setStatus] = useState<string>("all")
    const [yoeMin, setYoeMin] = useState("")
    const [yoeMax, setYoeMax] = useState("")
    const [tcMin, setTcMin] = useState("")
    const [tcMax, setTcMax] = useState("")
    const [remoteOnly, setRemoteOnly] = useState(false)
    const [techStack, setTechStack] = useState<string[]>([])
    const [techInput, setTechInput] = useState("")
    const [sortBy, setSortBy] = useState<SortOption>("date-desc")
    const supabase = createClient()

    const { data: jobs, isLoading } = useQuery({
        queryKey: ['jobs', search, status, yoeMin, yoeMax, tcMin, tcMax, remoteOnly, techStack, sortBy],
        queryFn: async () => {
            // Fetch all jobs from Supabase
            const { data, error } = await supabase
                .from('jobs')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            const allJobs = (data || []) as Job[]

            // Client-side filtering (MVP approach)
            let filtered = allJobs.filter(job => {
                const meta = job.metadata || {}

                // Search
                if (search) {
                    const q = search.toLowerCase()
                    const matchTitle = (job.title || '').toLowerCase().includes(q)
                    const matchCompany = (job.company || '').toLowerCase().includes(q)
                    const matchTech = meta.tech_stack?.some((t: string) => t.toLowerCase().includes(q))
                    if (!matchTitle && !matchCompany && !matchTech) return false
                }

                // Status
                if (status !== "all" && job.status !== status) return false

                // YoE
                const jobYoe = meta.yoe || 0
                if (yoeMin && jobYoe < parseInt(yoeMin)) return false
                if (yoeMax && jobYoe > parseInt(yoeMax)) return false

                // TC
                const jobTcMin = meta.tc_min || 0
                const jobTcMax = meta.tc_max || 999
                if (tcMin && jobTcMax < parseInt(tcMin)) return false
                if (tcMax && jobTcMin > parseInt(tcMax)) return false

                // Remote
                if (remoteOnly && !meta.remote) return false

                // Tech Stack
                if (techStack.length > 0) {
                    const jobStack = meta.tech_stack?.map((s: string) => s.toLowerCase()) || []
                    const hasMatch = techStack.some(t => jobStack.includes(t.toLowerCase()))
                    if (!hasMatch) return false
                }

                return true
            })

            // Sort
            filtered.sort((a, b) => {
                const metaA = a.metadata || {}
                const metaB = b.metadata || {}

                switch (sortBy) {
                    case 'date-desc':
                        return (new Date(metaB.posted_date || a.created_at || '').getTime()) - (new Date(metaA.posted_date || b.created_at || '').getTime())
                    case 'date-asc':
                        return (new Date(metaA.posted_date || a.created_at || '').getTime()) - (new Date(metaB.posted_date || b.created_at || '').getTime())
                    case 'tc-desc':
                        return (metaB.tc_max || 0) - (metaA.tc_max || 0)
                    case 'tc-asc':
                        return (metaA.tc_min || 0) - (metaB.tc_min || 0)
                    case 'yoe-desc':
                        return (metaB.yoe || 0) - (metaA.yoe || 0)
                    case 'yoe-asc':
                        return (metaA.yoe || 0) - (metaB.yoe || 0)
                    default:
                        return 0
                }
            })

            return filtered
        }
    })

    const handleTechAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && techInput.trim()) {
            if (!techStack.includes(techInput.trim())) {
                setTechStack([...techStack, techInput.trim()])
            }
            setTechInput("")
        }
    }

    const clearFilters = () => {
        setSearch("")
        setStatus("all")
        setYoeMin("")
        setYoeMax("")
        setTcMin("")
        setTcMax("")
        setRemoteOnly(false)
        setTechStack([])
    }

    const hasActiveFilters = search || status !== "all" || yoeMin || yoeMax || tcMin || tcMax || remoteOnly || techStack.length > 0

    return (
        <div className="min-h-screen bg-white text-black font-mono">
            {/* Header */}
            <header className="border-b-2 border-black px-6 py-4">
                <h1 className="text-2xl font-bold tracking-tight">ATREUS</h1>
                <p className="text-sm opacity-60">Job Application Tracker</p>
            </header>

            {/* Filters Bar */}
            <div className="border-b border-black/20 px-6 py-4 space-y-4">
                {/* Row 1: Search + Sort */}
                <div className="flex gap-4 items-center">
                    <div className="flex-1 relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                        <Input
                            placeholder="Search jobs, companies, or skills..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 bg-transparent border-black/30 rounded-none focus:ring-0 focus:border-black font-mono"
                        />
                    </div>
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                        <SelectTrigger className="w-48 bg-transparent border-black/30 rounded-none font-mono">
                            <ArrowUpDownIcon className="w-4 h-4 mr-2 opacity-40" />
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent className="font-mono rounded-none border-black">
                            <SelectItem value="date-desc">Newest first</SelectItem>
                            <SelectItem value="date-asc">Oldest first</SelectItem>
                            <SelectItem value="tc-desc">Highest TC</SelectItem>
                            <SelectItem value="tc-asc">Lowest TC</SelectItem>
                            <SelectItem value="yoe-desc">Most experience</SelectItem>
                            <SelectItem value="yoe-asc">Least experience</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Row 2: Filter Controls */}
                <div className="flex flex-wrap gap-3 items-center text-sm">
                    {/* Status */}
                    <div className="flex items-center gap-2">
                        <span className="opacity-60">Status:</span>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="w-32 h-8 bg-transparent border-black/30 rounded-none text-xs font-mono">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="font-mono rounded-none border-black">
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="saved">Saved</SelectItem>
                                <SelectItem value="tailoring">Tailoring</SelectItem>
                                <SelectItem value="applied">Applied</SelectItem>
                                <SelectItem value="interviewing">Interviewing</SelectItem>
                                <SelectItem value="offer">Offer</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <span className="opacity-20">|</span>

                    {/* YoE Range */}
                    <div className="flex items-center gap-2">
                        <span className="opacity-60">YoE:</span>
                        <Input
                            type="number"
                            placeholder="Min"
                            value={yoeMin}
                            onChange={(e) => setYoeMin(e.target.value)}
                            className="w-16 h-8 bg-transparent border-black/30 rounded-none text-xs font-mono text-center"
                        />
                        <span className="opacity-40">–</span>
                        <Input
                            type="number"
                            placeholder="Max"
                            value={yoeMax}
                            onChange={(e) => setYoeMax(e.target.value)}
                            className="w-16 h-8 bg-transparent border-black/30 rounded-none text-xs font-mono text-center"
                        />
                    </div>

                    <span className="opacity-20">|</span>

                    {/* TC Range */}
                    <div className="flex items-center gap-2">
                        <span className="opacity-60">TC ($k):</span>
                        <Input
                            type="number"
                            placeholder="Min"
                            value={tcMin}
                            onChange={(e) => setTcMin(e.target.value)}
                            className="w-16 h-8 bg-transparent border-black/30 rounded-none text-xs font-mono text-center"
                        />
                        <span className="opacity-40">–</span>
                        <Input
                            type="number"
                            placeholder="Max"
                            value={tcMax}
                            onChange={(e) => setTcMax(e.target.value)}
                            className="w-16 h-8 bg-transparent border-black/30 rounded-none text-xs font-mono text-center"
                        />
                    </div>

                    <span className="opacity-20">|</span>

                    {/* Remote Toggle */}
                    <button
                        onClick={() => setRemoteOnly(!remoteOnly)}
                        className={`h-8 px-3 border text-xs font-mono transition-colors ${remoteOnly
                            ? 'bg-black text-white border-black'
                            : 'bg-transparent text-black border-black/30 hover:border-black'
                            }`}
                    >
                        Remote only
                    </button>

                    <span className="opacity-20">|</span>

                    {/* Tech Stack */}
                    <div className="flex items-center gap-2">
                        <span className="opacity-60">Tech:</span>
                        <Input
                            placeholder="Add skill..."
                            value={techInput}
                            onChange={(e) => setTechInput(e.target.value)}
                            onKeyDown={handleTechAdd}
                            className="w-24 h-8 bg-transparent border-black/30 rounded-none text-xs font-mono"
                        />
                    </div>

                    {/* Clear */}
                    {hasActiveFilters && (
                        <>
                            <span className="opacity-20">|</span>
                            <button
                                onClick={clearFilters}
                                className="h-8 px-3 text-xs font-mono opacity-60 hover:opacity-100 underline"
                            >
                                Clear all
                            </button>
                        </>
                    )}
                </div>

                {/* Row 3: Active Tech Tags */}
                {techStack.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {techStack.map(tech => (
                            <button
                                key={tech}
                                onClick={() => setTechStack(techStack.filter(t => t !== tech))}
                                className="inline-flex items-center gap-1 px-2 py-1 border border-black/50 text-xs font-mono hover:bg-black hover:text-white transition-colors"
                            >
                                {tech}
                                <XIcon className="w-3 h-3" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Results Count */}
            <div className="px-6 py-3 border-b border-black/10 text-sm opacity-60 font-mono">
                {isLoading ? 'Loading...' : `${jobs?.length || 0} positions`}
            </div>

            {/* Job List */}
            <div className="divide-y divide-black/10">
                {isLoading ? (
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="px-6 py-5 animate-pulse">
                            <div className="h-5 bg-black/10 w-1/3 mb-2" />
                            <div className="h-4 bg-black/5 w-1/4" />
                        </div>
                    ))
                ) : jobs?.length === 0 ? (
                    <div className="px-6 py-12 text-center opacity-40 font-mono">
                        No jobs match your filters.
                    </div>
                ) : (
                    jobs?.map(job => {
                        const meta = job.metadata || {}
                        return (
                            <Link
                                key={job.id}
                                href={`/jobs/${job.id}/tailor`}
                                className="block px-6 py-5 hover:bg-black/[0.02] transition-colors group"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h2 className="text-lg font-semibold group-hover:underline">{job.title}</h2>
                                        <p className="text-sm opacity-60">{job.company} · {meta.location || 'Remote'}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold">
                                            {meta.tc_min ? `$${meta.tc_min}k` : '???'} – {meta.tc_max ? `$${meta.tc_max}k` : '???'}
                                        </div>
                                        <div className="text-xs opacity-40">{meta.yoe || 0}+ years</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-xs">
                                    <span className="px-2 py-0.5 border border-black/30 uppercase tracking-wider">
                                        {job.status}
                                    </span>
                                    {meta.remote && (
                                        <span className="opacity-60">Remote</span>
                                    )}
                                    <span className="opacity-40">·</span>
                                    <span className="opacity-40">{meta.posted_date || 'Recently'}</span>
                                    <span className="opacity-40">·</span>
                                    <span className="opacity-60">{meta.tech_stack?.join(', ')}</span>
                                </div>
                            </Link>
                        )
                    })
                )}
            </div>
        </div>
    )
}
