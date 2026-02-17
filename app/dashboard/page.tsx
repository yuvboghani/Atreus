'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client' // Ensure this exists or use correct path
import { JobFilters } from '@/components/job-board/filters'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table" // Assuming shadcn table exists
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
    ColumnDef
} from '@tanstack/react-table'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

// Define Job Type
type Job = {
    id: string
    title: string
    company: string
    created_at: string
    status: string
    metadata: {
        salary?: string
        tech_stack?: string[]
    }
}

export default function DashboardPage() {
    const [jobs, setJobs] = useState<Job[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    // Filters State
    const [filters, setFilters] = useState({
        yoe: [0, 20],
        tc: [0, 500],
        techStack: [] as string[]
    })

    useEffect(() => {
        const fetchJobs = async () => {
            setLoading(true)
            const supabase = createClient()
            const { data, error } = await supabase
                .from('jobs')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching jobs:', error)
            } else {
                setJobs(data as Job[] || [])
            }
            setLoading(false)
        }

        fetchJobs()
    }, [])

    // Filter Logic
    const filteredJobs = useMemo(() => {
        return jobs.filter(job => {
            // Salary Filter (Basic parsing)
            // e.g. "$120k-$150k" -> check overlap with filters.tc
            // This is a naive implementation. For real interactions we need robust parsing.
            // We will skip complex SC parsing for now and rely on exact text match or skip if empty.

            // Tech Stack Filter
            if (filters.techStack.length > 0) {
                const jobStack = job.metadata?.tech_stack || []
                // Check if job has ALL selected tech? Or ANY? Let's say ANY for now.
                const hasMatch = filters.techStack.some(tech =>
                    jobStack.some(jTech => jTech.toLowerCase().includes(tech.toLowerCase()))
                )
                if (!hasMatch) return false
            }

            return true
        })
    }, [jobs, filters])

    // Table Columns
    const columns: ColumnDef<Job>[] = [
        {
            accessorKey: 'title',
            header: 'Role',
            cell: ({ row }) => <span className="font-medium">{row.getValue('title')}</span>,
        },
        {
            accessorKey: 'company',
            header: 'Company',
        },
        {
            accessorKey: 'metadata.salary',
            header: 'Salary',
            cell: ({ row }) => row.original.metadata?.salary || 'N/A',
        },
        {
            accessorKey: 'metadata.tech_stack',
            header: 'Tech Stack',
            cell: ({ row }) => {
                const stack = row.original.metadata?.tech_stack || []
                return (
                    <div className="flex flex-wrap gap-1">
                        {stack.slice(0, 3).map((tech, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{tech}</Badge>
                        ))}
                        {stack.length > 3 && <span className="text-xs text-muted-foreground">+{stack.length - 3}</span>}
                    </div>
                )
            }
        },
        {
            accessorKey: 'created_at',
            header: 'Posted',
            cell: ({ row }) => new Date(row.getValue('created_at')).toLocaleDateString(),
        },
        {
            id: 'actions',
            cell: ({ row }) => {
                return (
                    <Link href={`/jobs/${row.original.id}`}>
                        <Button size="sm" variant="outline">
                            View
                        </Button>
                    </Link>
                )
            },
        },
    ]

    const table = useReactTable({
        data: filteredJobs,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    })

    return (
        <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950">
            <JobFilters filters={filters} setFilters={setFilters} />

            <div className="flex-1 p-8 overflow-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold tracking-tight">Job Board</h1>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{filteredJobs.length} jobs found</span>
                    </div>
                </div>

                <div className="rounded-md border bg-white dark:bg-slate-900 shadow-sm">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map(headerGroup => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder ? null : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map(row => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                    >
                                        {row.getVisibleCells().map(cell => (
                                            <TableCell key={cell.id}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-24 text-center">
                                        {loading ? "Loading jobs..." : "No results."}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex items-center justify-end space-x-2 py-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    )
}
