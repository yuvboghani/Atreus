'use client'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface GapAnalysisProps {
    data: {
        gaps: Array<{
            skill: string
            project_name: string
            project_description: string
        }>
    }
}

export function GapAnalysis({ data }: GapAnalysisProps) {
    if (!data?.gaps) return null

    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
                🚫 Skills Gap Analysis
            </h3>
            {data.gaps.map((gap, idx) => (
                <Card key={idx} className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <CardTitle className="text-sm font-bold text-amber-800 dark:text-amber-500">
                                Missing: {gap.skill}
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm">
                            <span className="font-semibold block mb-1">🚀 1-Week Project: {gap.project_name}</span>
                            <p className="text-muted-foreground">{gap.project_description}</p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
