'use client';

import { useState } from 'react';
import { updateApplicationStatus } from "@/app/actions/update-status";
import { cn } from "@/lib/utils";

interface PipelineStatusSelectProps {
    applicationId: string;
    initialStatus: string;
}

const STATUS_OPTIONS = [
    'saved',
    'draft',
    'applied',
    'interviewing',
    'rejected',
    'offer'
];

export function PipelineStatusSelect({ applicationId, initialStatus }: PipelineStatusSelectProps) {
    const [status, setStatus] = useState(initialStatus);
    const [loading, setLoading] = useState(false);

    const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;
        setStatus(newStatus);
        setLoading(true);

        try {
            await updateApplicationStatus(applicationId, newStatus);
        } catch (error) {
            console.error(error);
            // Revert optimization handling could go here, but simple for now
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative">
            <select
                value={status}
                onChange={handleChange}
                className={cn(
                    "h-8 w-32 appearance-none rounded-none border-2 border-black bg-transparent px-2 text-[10px] font-bold uppercase focus:outline-none cursor-pointer",
                    status === 'booked' || status === 'offer' ? "bg-black text-white" : "hover:bg-muted/10",
                    loading && "opacity-50 cursor-wait"
                )}
                disabled={loading}
            >
                {STATUS_OPTIONS.map(opt => (
                    <option key={opt} value={opt} className="text-black bg-white">{opt.toUpperCase()}</option>
                ))}
            </select>
            {/* Custom arrow if needed, but native is brutalist enough often */}
        </div>
    );
}
