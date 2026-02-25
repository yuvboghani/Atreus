'use client';

import { useState } from 'react';
import { XIcon } from "lucide-react";

interface SystemAlertProps {
    staleDrafts: number;
    highMatchTargets: number;
}

export function SystemAlert({ staleDrafts, highMatchTargets }: SystemAlertProps) {
    const [visible, setVisible] = useState(true);

    if (!visible) return null;
    if (staleDrafts === 0 && highMatchTargets === 0) return null;

    return (
        <div className="bg-black text-[#F4F4F0] p-3 mb-6 font-mono text-xs flex justify-between items-center border-l-4 border-red-500 animate-in slide-in-from-top-2">
            <div className="flex gap-4">
                <span className="font-bold text-red-500 animate-pulse">{'>'} SYSTEM ALERT:</span>
                <span>
                    {staleDrafts > 0 && `[${staleDrafts}] Stale Drafts require attention. `}
                    {highMatchTargets > 0 && `[${highMatchTargets}] High-Match targets acquired.`}
                </span>
            </div>
            <button onClick={() => setVisible(false)} className="hover:text-red-500">
                <XIcon className="w-4 h-4" />
            </button>
        </div>
    );
}
