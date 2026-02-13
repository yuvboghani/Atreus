'use client'

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Job } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { SearchIcon, XIcon, ArrowUpDownIcon, ChevronDownIcon } from "lucide-react"

// Mock data
const MOCK_JOBS: Job[] = [
    {
        id: '1',
        title: 'Senior Frontend Engineer',
        company: 'TechCorp',
        status: 'saved',
        metadata: {
            yoe: 5,
            tc_min: 180,
            tc_max: 220,
            tech_stack: ['React', 'TypeScript', 'Next.js'],
            location: 'Remote',
            posted_date: '2026-01-25',
            job_type: 'full-time',
            remote: true
        }
    },
    {
        id: '2',
        title: 'Backend Developer',
        company: 'DevInc',
        status: 'applied',
        metadata: {
            yoe: 3,
            tc_min: 140,
            tc_max: 160,
            tech_stack: ['Python', 'Django', 'PostgreSQL'],
            location: 'New York, NY',
            posted_date: '2026-01-20',
            job_type: 'full-time',
            remote: false
        }
    },
    {
        id: '3',
        title: 'Full Stack Engineer',
        company: 'StartupXYZ',
        status: 'interviewing',
        metadata: {
            yoe: 4,
            tc_min: 160,
            tc_max: 200,
            tech_stack: ['Node.js', 'React', 'AWS', 'Docker'],
            location: 'San Francisco, CA',
            posted_date: '2026-01-22',
            job_type: 'full-time',
            remote: true
        }
    },
    {
        id: '4',
        title: 'DevOps Engineer',
        company: 'CloudNative Inc',
        status: 'saved',
        metadata: {
            yoe: 6,
            tc_min: 200,
            tc_max: 250,
            tech_stack: ['Kubernetes', 'Terraform', 'AWS', 'Go'],
            location: 'Seattle, WA',
            posted_date: '2026-01-28',
            job_type: 'full-time',
            remote: true
        }
    }
]

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

    const { data: jobs, isLoading } = useQuery({
        queryKey: ['jobs', search, status, yoeMin, yoeMax, tcMin, tcMax, remoteOnly, techStack, sortBy],
        queryFn: async () => {
            await new Promise(r => setTimeout(r, 300))

            let filtered = MOCK_JOBS.filter(job => {
                // Search
                if (search) {
                    const q = search.toLowerCase()
                    const matchTitle = job.title.toLowerCase().includes(q)
                    const matchCompany = job.company.toLowerCase().includes(q)
                    const matchTech = job.metadata.tech_stack?.some(t => t.toLowerCase().includes(q))
                    if (!matchTitle && !matchCompany && !matchTech) return false
                }

                // Status
                if (status !== "all" && job.status !== status) return false

                // YoE
                const jobYoe = job.metadata.yoe || 0
                if (yoeMin && jobYoe < parseInt(yoeMin)) return false
                if (yoeMax && jobYoe > parseInt(yoeMax)) return false

                // TC
                const jobTcMin = job.metadata.tc_min || 0
                const jobTcMax = job.metadata.tc_max || 999
                if (tcMin && jobTcMax < parseInt(tcMin)) return false
                if (tcMax && jobTcMin > parseInt(tcMax)) return false

                // Remote
                if (remoteOnly && !job.metadata.remote) return false

                // Tech Stack
                if (techStack.length > 0) {
                    const jobStack = job.metadata.tech_stack?.map(s => s.toLowerCase()) || []
                    const hasMatch = techStack.some(t => jobStack.includes(t.toLowerCase()))
                    if (!hasMatch) return false
                }

                return true
            })

            // Sort
            filtered.sort((a, b) => {
                switch (sortBy) {
                    case 'date-desc':
                        return (b.metadata.posted_date || '').localeCompare(a.metadata.posted_date || '')
                    case 'date-asc':
                        return (a.metadata.posted_date || '').localeCompare(b.metadata.posted_date || '')
                    case 'tc-desc':
                        return (b.metadata.tc_max || 0) - (a.metadata.tc_max || 0)
                    case 'tc-asc':
                        return (a.metadata.tc_min || 0) - (b.metadata.tc_min || 0)
                    case 'yoe-desc':
                        return (b.metadata.yoe || 0) - (a.metadata.yoe || 0)
                    case 'yoe-asc':
                        return (a.metadata.yoe || 0) - (b.metadata.yoe || 0)
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
                    jobs?.map(job => (
                        <Link
                            key={job.id}
                            href={`/jobs/${job.id}/tailor`}
                            className="block px-6 py-5 hover:bg-black/[0.02] transition-colors group"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h2 className="text-lg font-semibold group-hover:underline">{job.title}</h2>
                                    <p className="text-sm opacity-60">{job.company} · {job.metadata.location}</p>
                                </div>
                                <div className="text-right">
                                    <div className="font-semibold">${job.metadata.tc_min}k – ${job.metadata.tc_max}k</div>
                                    <div className="text-xs opacity-40">{job.metadata.yoe}+ years</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                                <span className="px-2 py-0.5 border border-black/30 uppercase tracking-wider">
                                    {job.status}
                                </span>
                                {job.metadata.remote && (
                                    <span className="opacity-60">Remote</span>
                                )}
                                <span className="opacity-40">·</span>
                                <span className="opacity-40">{job.metadata.posted_date}</span>
                                <span className="opacity-40">·</span>
                                <span className="opacity-60">{job.metadata.tech_stack?.join(', ')}</span>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    )
}
