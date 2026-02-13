'use client'

import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useState } from "react"
import { SlidersIcon, DollarSignIcon, CodeIcon, XIcon, SparklesIcon } from "lucide-react"

interface FiltersProps {
    filters: {
        yoe: number[]
        tc: number[]
        techStack: string[]
    }
    setFilters: (filters: any) => void
}

export function JobFilters({ filters, setFilters }: FiltersProps) {
    const [techInput, setTechInput] = useState("")

    const handleTechAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && techInput.trim()) {
            if (!filters.techStack.includes(techInput.trim())) {
                setFilters({
                    ...filters,
                    techStack: [...filters.techStack, techInput.trim()]
                })
            }
            setTechInput("")
        }
    }

    const removeTech = (tech: string) => {
        setFilters({
            ...filters,
            techStack: filters.techStack.filter((t: string) => t !== tech)
        })
    }

    return (
        <div className="w-72 flex flex-col h-full bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        <SlidersIcon className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-lg">Filters</h3>
                </div>
            </div>

            {/* Filters Content */}
            <div className="flex-1 p-5 space-y-6 overflow-auto">
                {/* YoE Slider */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <SparklesIcon className="w-4 h-4 text-muted-foreground" />
                        <Label className="font-medium">Experience Level</Label>
                    </div>
                    <div className="px-1">
                        <Slider
                            value={filters.yoe}
                            max={20}
                            step={1}
                            onValueChange={(val) => setFilters({ ...filters, yoe: val })}
                            className="my-2"
                        />
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 font-medium">
                            {filters.yoe[0]} years
                        </span>
                        <span className="text-muted-foreground">to</span>
                        <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 font-medium">
                            {filters.yoe[1]} years
                        </span>
                    </div>
                </div>

                <Separator />

                {/* TC Slider */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <DollarSignIcon className="w-4 h-4 text-emerald-500" />
                        <Label className="font-medium">Total Compensation</Label>
                    </div>
                    <div className="px-1">
                        <Slider
                            value={filters.tc}
                            min={0}
                            max={500}
                            step={10}
                            onValueChange={(val) => setFilters({ ...filters, tc: val })}
                            className="my-2"
                        />
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium">
                            ${filters.tc[0]}k
                        </span>
                        <span className="text-muted-foreground">to</span>
                        <span className="px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium">
                            ${filters.tc[1]}k
                        </span>
                    </div>
                </div>

                <Separator />

                {/* Tech Stack */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <CodeIcon className="w-4 h-4 text-blue-500" />
                        <Label className="font-medium">Tech Stack</Label>
                    </div>

                    <Input
                        placeholder="Type and press Enter..."
                        value={techInput}
                        onChange={(e) => setTechInput(e.target.value)}
                        onKeyDown={handleTechAdd}
                        className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                    />

                    {filters.techStack.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {filters.techStack.map(tech => (
                                <Badge
                                    key={tech}
                                    variant="secondary"
                                    className="cursor-pointer pl-3 pr-2 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950 dark:hover:text-red-300 transition-colors group"
                                    onClick={() => removeTech(tech)}
                                >
                                    {tech}
                                    <XIcon className="w-3 h-3 ml-1.5 opacity-50 group-hover:opacity-100" />
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                <p className="text-xs text-muted-foreground text-center">
                    Adjust filters to find your perfect role
                </p>
            </div>
        </div>
    )
}
