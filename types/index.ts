export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Job {
    id: string
    title: string
    company: string
    status: 'saved' | 'tailoring' | 'applied' | 'interviewing' | 'offer' | 'rejected'
    metadata: {
        yoe?: number
        tc_min?: number
        tc_max?: number
        tech_stack?: string[]
        location?: string
        remote?: boolean
        posted_date?: string
        job_type?: string
    }
    created_at?: string
    gap_analysis?: any // For later
}
