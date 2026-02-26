'use client';

import { useState, useCallback, useRef, useEffect, FormEvent } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { TerminalIcon, Loader2Icon, SendIcon } from "lucide-react";
import { ForgeWorkbench } from "@/components/forge/forge-workbench";

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

interface ForgeShellProps {
    job: any;
    skillBank: string[];
}

/**
 * ForgeShell — Client wrapper that holds shared LaTeX state
 * between the Workbench (left pane) and the Strategist (right pane).
 * Also hosts the full Strategist chat UI with AI-powered mutation.
 */
export function ForgeShell({ job, skillBank }: ForgeShellProps) {
    // Shared LaTeX state — initialized with template, mutated by Strategist
    const getInitialLatex = useCallback(() => {
        const meta = job.metadata || {};
        const techStack = meta.tech_stack?.join(', ') || 'N/A';
        return `\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage[hidelinks]{hyperref}

\\titleformat{\\section}{\\large\\bfseries\\uppercase}{}{0em}{}[\\titlerule]
\\titlespacing{\\section}{0pt}{10pt}{6pt}
\\setlength{\\parindent}{0pt}

\\begin{document}

\\begin{center}
{\\LARGE\\textbf{ATREUS CANDIDATE}} \\\\[4pt]
{\\small atreus@protonmail.com $\\vert$ github.com/atreus $\\vert$ +1 (555) 000-0000}
\\end{center}

\\section{Objective}
Experienced engineer seeking the \\textbf{${job.title}} role at \\textbf{${job.company}}.
Core competencies aligned with target stack: ${techStack}.

\\section{Technical Skills}
\\begin{itemize}[leftmargin=*, nosep]
\\item \\textbf{Languages:} Go, Python, TypeScript, C++
\\item \\textbf{Frameworks:} React, Next.js, FastAPI, gRPC
\\item \\textbf{Infrastructure:} Kubernetes, Docker, Terraform, AWS
\\item \\textbf{Data:} PostgreSQL, Redis, Kafka, Supabase
\\end{itemize}

\\section{Experience}
\\textbf{Senior Software Engineer} \\hfill 2022 -- Present \\\\
\\textit{Atreus Labs} \\\\
\\begin{itemize}[leftmargin=*, nosep]
\\item Designed and deployed multi-agent AI pipeline processing 10K+ job descriptions daily
\\item Built real-time resume tailoring engine with LaTeX compilation (sub-3s P95)
\\item Reduced infrastructure cost by 40\\% through Kubernetes autoscaling optimization
\\end{itemize}

\\vspace{4pt}
\\textbf{Software Engineer} \\hfill 2020 -- 2022 \\\\
\\textit{Previous Corp} \\\\
\\begin{itemize}[leftmargin=*, nosep]
\\item Developed distributed microservices handling 50K RPM with 99.95\\% uptime
\\item Implemented CI/CD pipelines reducing deployment time from 45min to 4min
\\end{itemize}

\\section{Education}
\\textbf{B.S. Computer Science} \\hfill 2020 \\\\
\\textit{University of Engineering}

\\end{document}`;
    }, [job]);

    const [currentLatex, setCurrentLatex] = useState<string>(getInitialLatex);

    // Chat state
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        {
            role: 'system',
            content: `System Online. Analyzed ${job.title} reqs.\nDetected gaps in your profile. Ready for commands.`,
            timestamp: Date.now(),
        }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    // Track mutation count
    const [mutationCount, setMutationCount] = useState(0);

    /**
     * THE MUTATION LOOP
     * 1. Send prompt + currentLatex + chatHistory → /api/strategist
     * 2. Append AI response to chatHistory
     * 3. Regex extract ```latex ... ``` block
     * 4. If found → setCurrentLatex (instant middle pane refresh)
     */
    const executeMutation = useCallback(async (prompt: string, updatedHistory: ChatMessage[]) => {
        setIsThinking(true);
        try {
            const apiHistory = updatedHistory
                .filter(m => m.role !== 'system')
                .map(m => ({ role: m.role, content: m.content }));

            const response = await fetch('/api/strategist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    currentLatex,
                    chatHistory: apiHistory,
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errData.details || errData.error || 'Strategist offline');
            }

            const { response: aiResponse } = await response.json();

            // Append AI response to chat
            const aiMsg: ChatMessage = { role: 'assistant', content: aiResponse, timestamp: Date.now() };
            setChatHistory(prev => [...prev, aiMsg]);

            const latexMatch = aiResponse.match(/```latex\n([\s\S]*?)```/);
            if (latexMatch && latexMatch[1]) {
                const newLatex = latexMatch[1].trim();
                setCurrentLatex(newLatex);
                setMutationCount(prev => prev + 1);
                console.log('[STRATEGIST] LaTeX mutated! Length:', newLatex.length);
            }
        } catch (err: any) {
            const errorMsg: ChatMessage = {
                role: 'assistant',
                content: `⚠ ERROR: ${err.message || 'Strategist connection failed'}`,
                timestamp: Date.now(),
            };
            setChatHistory(prev => [...prev, errorMsg]);
        } finally {
            setIsThinking(false);
            inputRef.current?.focus();
        }
    }, [currentLatex]);

    const handleChatSubmit = useCallback(async (e: FormEvent) => {
        e.preventDefault();
        const prompt = chatInput.trim();
        if (!prompt || isThinking) return;

        const userMsg: ChatMessage = { role: 'user', content: prompt, timestamp: Date.now() };
        const newHistory = [...chatHistory, userMsg];
        setChatHistory(newHistory);
        setChatInput('');

        await executeMutation(prompt, newHistory);
    }, [chatInput, isThinking, chatHistory, executeMutation]);

    const handleInjectSkill = useCallback(async (skill: string) => {
        if (isThinking) return;
        const prompt = `I want to add the skill '${skill}' to my resume to better match the job description. Please rewrite the relevant bullet points or projects to legitimately and naturally include this skill.`;
        const userMsg: ChatMessage = { role: 'user', content: prompt, timestamp: Date.now() };
        const newHistory = [...chatHistory, userMsg];
        setChatHistory(newHistory);
        await executeMutation(prompt, newHistory);
    }, [chatHistory, isThinking, executeMutation]);

    const handleRejectSkill = useCallback(async (skill: string) => {
        if (isThinking) return;
        const prompt = `Remove the skill '${skill}' from my resume. It is implausible for my experience or a hallucination. Rewrite any bullet points that mention it to focus on my actual strengths.`;
        const userMsg: ChatMessage = { role: 'user', content: prompt, timestamp: Date.now() };
        const newHistory = [...chatHistory, userMsg];
        setChatHistory(newHistory);
        await executeMutation(prompt, newHistory);
    }, [chatHistory, isThinking, executeMutation]);

    const handleBatchSkillUpdate = useCallback(async (injections: string[], rejections: string[]) => {
        if (isThinking) return;

        let promptParts = ["I am updating my resume skills for this specific job."];
        if (injections.length > 0) {
            promptParts.push(`Please naturally WEAVE IN these missing skills: ${injections.join(', ')}.`);
        }
        if (rejections.length > 0) {
            promptParts.push(`Please REMOVE these irrelevant/hallucinated skills: ${rejections.join(', ')}.`);
        }
        promptParts.push("Rewrite the relevant LaTeX bullet points and return the full updated LaTeX block.");

        const prompt = promptParts.join(' ');
        const userMsg: ChatMessage = { role: 'user', content: prompt, timestamp: Date.now() };
        const newHistory = [...chatHistory, userMsg];
        setChatHistory(newHistory);
        await executeMutation(prompt, newHistory);
    }, [chatHistory, isThinking, executeMutation]);

    return (
        <ResizablePanelGroup direction="horizontal" className="flex-1">

            {/* LEFT: THE WORKBENCH (75%) */}
            <ResizablePanel defaultSize={75} minSize={50}>
                <ForgeWorkbench
                    job={job}
                    currentLatex={currentLatex}
                    skillBank={skillBank}
                    onInjectSkill={handleInjectSkill}
                    onRejectSkill={handleRejectSkill}
                    onBatchSkillUpdate={handleBatchSkillUpdate}
                />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* RIGHT: AI STRATEGIST (25%) */}
            <ResizablePanel defaultSize={25} minSize={20} className="bg-black text-white">
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="h-8 border-b border-white/20 flex items-center px-2 justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                            <TerminalIcon className="w-3 h-3" /> STRATEGIST_UPLINK
                        </span>
                        <div className="flex items-center gap-2">
                            {mutationCount > 0 && (
                                <span className="text-[9px] text-green-400 font-mono">
                                    {mutationCount} MUTATION{mutationCount > 1 ? 'S' : ''}
                                </span>
                            )}
                            <div className={`w-2 h-2 ${isThinking ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`}></div>
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="p-3 flex-1 overflow-auto font-mono text-xs space-y-3">
                        {chatHistory.map((msg, i) => (
                            <div key={i} className={`${msg.role === 'user'
                                ? 'border-l-2 border-white/40 pl-2'
                                : msg.role === 'system'
                                    ? 'opacity-50 border-l-2 border-white/20 pl-2'
                                    : 'text-green-400'
                                }`}>
                                {msg.role === 'user' && (
                                    <div className="text-[9px] text-white/40 mb-0.5 uppercase">YOU</div>
                                )}
                                {msg.role === 'assistant' && (
                                    <div className="text-[9px] text-green-400/60 mb-0.5 uppercase">STRATEGIST</div>
                                )}
                                <div className="whitespace-pre-wrap break-words leading-relaxed">
                                    {/* For assistant messages, hide the raw latex block and show a mutation badge */}
                                    {msg.role === 'assistant' && msg.content.includes('```latex') ? (
                                        <>
                                            {msg.content.split('```latex')[0]}
                                            <div className="mt-2 border border-green-500/30 bg-green-500/10 px-2 py-1 text-green-400 text-[10px]">
                                                ✓ LATEX MUTATED — Changes applied to workspace
                                            </div>
                                        </>
                                    ) : (
                                        msg.content
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Thinking indicator */}
                        {isThinking && (
                            <div className="flex items-center gap-2 text-yellow-500">
                                <Loader2Icon className="w-3 h-3 animate-spin" />
                                <span className="text-[10px] uppercase tracking-widest animate-pulse">
                                    Processing...
                                </span>
                            </div>
                        )}

                        <div ref={chatEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleChatSubmit} className="p-2 border-t border-white/20 flex items-center gap-2">
                        <span className="text-green-400 text-xs">&gt;_</span>
                        <input
                            ref={inputRef}
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            disabled={isThinking}
                            className="flex-1 bg-transparent outline-none text-xs text-white placeholder:opacity-30 disabled:opacity-50"
                            placeholder={isThinking ? "PROCESSING..." : "ENTER COMMAND..."}
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={isThinking || !chatInput.trim()}
                            className="text-white/40 hover:text-white disabled:opacity-20 transition-colors"
                        >
                            <SendIcon className="w-3 h-3" />
                        </button>
                    </form>
                </div>
            </ResizablePanel>

        </ResizablePanelGroup>
    );
}
