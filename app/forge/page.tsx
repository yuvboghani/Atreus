'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AnvilIcon, Loader2Icon } from 'lucide-react';

export default function ForgePage() {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleIngest = async () => {
        if (!input.trim()) return;
        setLoading(true);

        try {
            const res = await fetch('/api/ingest/private', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: input })
            });

            if (!res.ok) throw new Error('Ingestion failed');

            const { id } = await res.json();
            router.push(`/forge/${id}`);
        } catch (e) {
            console.error(e);
            setLoading(false);
            alert('Failed to ingest job. Please try again.');
        }
    };

    return (
        <div className="flex h-screen flex-col items-center justify-center p-8 max-w-2xl mx-auto text-center">
            <div className="mb-8">
                <h1 className="text-6xl font-black tracking-tighter mb-2">THE FORGE</h1>
                <p className="font-mono text-sm opacity-60 uppercase tracking-widest">
                    Raw Material Ingestion // Target Acquisition
                </p>
            </div>

            <div className="w-full space-y-4">
                <div className="relative">
                    <div className="absolute -top-3 left-4 bg-background px-2 font-mono text-xs font-bold border-2 border-black border-b-0 shadow-none z-10 w-fit">
                        PASTE JOB DATA (URL or TEXT)
                    </div>
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder=" Paste raw job description or URL here..."
                        className="h-64 font-mono text-sm p-6"
                    />
                </div>

                <Button
                    onClick={handleIngest}
                    disabled={loading || !input.trim()}
                    className="w-full h-14 text-lg font-mono tracking-widest bg-black text-white hover:bg-black/80"
                >
                    {loading ? (
                        <><Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> PROCESSING MATERIAL...</>
                    ) : (
                        <><AnvilIcon className="mr-2 h-5 w-5" /> INITIALIZE WORKSPACE</>
                    )}
                </Button>
            </div>
        </div>
    );
}
