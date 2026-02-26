'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { bookmarkJob } from "@/app/actions/bookmark-job";
import { BookmarkIcon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookmarkButtonProps {
    jobId: string;
    initialStatus?: string | null;
}

export function BookmarkButton({ jobId, initialStatus }: BookmarkButtonProps) {
    const [status, setStatus] = useState<string | null>(initialStatus || null);
    const [loading, setLoading] = useState(false);

    const isSaved = !!status;

    const handleBookmark = async (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent row click
        e.stopPropagation();

        if (isSaved || loading) return;

        setLoading(true);
        // Optimistic update
        setStatus('saved');

        try {
            await bookmarkJob(jobId);
        } catch (error) {
            console.error(error);
            setStatus(null); // Revert
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            size="sm"
            variant={isSaved ? "default" : "outline"}
            className={cn(
                "font-mono font-bold transition-colors border-2 border-black h-8 text-[10px] uppercase tracking-widest w-24 rounded-none",
                isSaved
                    ? "bg-black text-white hover:bg-[#F4F4F0] hover:text-black"
                    : "bg-[#F4F4F0] text-black hover:bg-black hover:text-white"
            )}
            onClick={handleBookmark}
            disabled={loading || (isSaved && status !== 'saved')} // Disable if applied/interviewing etc
        >
            {loading ? (
                "SAVING..."
            ) : isSaved ? (
                <><CheckIcon className="mr-1 w-3 h-3" /> {status === 'saved' ? 'SAVED' : status}</>
            ) : (
                <><BookmarkIcon className="mr-1 w-3 h-3" /> SAVE</>
            )}
        </Button>
    );
}
