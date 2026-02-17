import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';


export async function POST(req: NextRequest) {
    try {
        const { resumeId, tailoredTex } = await req.json();

        if (!resumeId || !tailoredTex) {
            return NextResponse.json({ error: 'resumeId and tailoredTex are required' }, { status: 400 });
        }

        const supabase = createServerClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Database client initialization failed' }, { status: 500 });
        }

        // 1. Fetch Master Resume Content
        const { data: resume, error: resumeError } = await supabase
            .from('resumes')
            .select('content_tex')
            .eq('id', resumeId)
            .single();

        if (resumeError || !resume) {
            console.error('Failed to fetch resume:', resumeError);
            return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
        }

        const masterTex = resume.content_tex;

        // 2. Call LaTeX Renderer
        // We use the docker service name "latex-renderer" or localhost depending on where this runs.
        // If running inside docker (next-app), use "latex-renderer".
        // If running locally, use "localhost".
        // Since I don't know the exact env, I'll try "latex-renderer" first (assuming prod-like) or fallback?
        // User instruction says "Send both to the LaTeX container (Port 5000) via internal Docker network (http://latex-renderer:5000/compile)".
        // So I will use `http://latex-renderer:5000/render` (I named it /render in server.js).

        // NOTE: Next.js app is running on host in dev mode often, but if user follows docker-compose setup, it is in container `next-app`.
        // The prompt says "internal Docker network", so I assume Next.js is in container.
        // BUT! I must handle the case where "next-app" might be running locally (npm run dev on host).
        // If running on host, `latex-renderer` hostname won't resolve. I need `localhost:5000`.
        // I will try to use an ENV var or default to `http://latex-renderer:5000`.

        const latexServiceUrl = process.env.LATEX_SERVICE_URL || 'http://latex-renderer:5000/render';

        let compileResponse;
        try {
            compileResponse = await fetch(latexServiceUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ master: masterTex, tailored: tailoredTex })
            });
        } catch (e) {
            // Fallback for local dev if latex-renderer fails (likely host network issue)
            console.warn(`Failed to connect to ${latexServiceUrl}, trying localhost:5000`);
            compileResponse = await fetch('http://localhost:5000/render', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ master: masterTex, tailored: tailoredTex })
            });
        }

        if (!compileResponse.ok) {
            const errText = await compileResponse.text();
            console.error('LaTeX compilation failed:', errText);
            return NextResponse.json({ error: 'Compilation failed', details: errText }, { status: 500 });
        }

        const { clean, diff, logs } = await compileResponse.json();

        if (!clean) {
            return NextResponse.json({ error: 'Failed to generate clean PDF', logs }, { status: 500 });
        }

        // 3. Upload to Supabase Storage
        // Bucket assumption: "resumes"
        const uploadFile = async (base64Data: string, path: string) => {
            const buffer = Buffer.from(base64Data, 'base64');
            const { data, error } = await supabase
                .storage
                .from('resumes')
                .upload(path, buffer, {
                    contentType: 'application/pdf',
                    upsert: true
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase
                .storage
                .from('resumes')
                .getPublicUrl(path);

            return publicUrl;
        };

        const timestamp = Date.now();
        const cleanPath = `${resumeId}/clean_${timestamp}.pdf`;
        const diffPath = `${resumeId}/diff_${timestamp}.pdf`;

        const cleanUrl = await uploadFile(clean, cleanPath);
        let diffUrl = null;
        if (diff) {
            diffUrl = await uploadFile(diff, diffPath);
        }

        return NextResponse.json({
            cleanUrl,
            diffUrl,
            logs // Optional, maybe helpful for debugging
        });

    } catch (error) {
        console.error('Compile API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: String(error) }, { status: 500 });
    }
}
