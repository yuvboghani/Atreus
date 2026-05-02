'use client';

import { useState, useCallback, useRef, useEffect, FormEvent } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
    UploadCloudIcon, FileTextIcon, Loader2Icon,
    SendIcon, TerminalIcon, CheckCircleIcon,
    XIcon, SparklesIcon, ShieldCheckIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

type Phase = 'upload' | 'workspace';

interface ArsenalWorkspaceProps {
    initialResumeText: string;
    initialSkillBank: string[];
    isOnboarded: boolean;
}

export function ArsenalWorkspace({
    initialResumeText,
    initialSkillBank,
    isOnboarded
}: ArsenalWorkspaceProps) {
    const [phase, setPhase] = useState<Phase>(
        initialResumeText ? 'workspace' : 'upload'
    );

    // Core state
    const [resumeText, setResumeText] = useState(initialResumeText);
    const [skillBank, setSkillBank] = useState<string[]>(initialSkillBank);

    // Upload state
    const [isDragging, setIsDragging] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'parsing' | 'initializing' | 'done' | 'error'>('idle');
    const [uploadError, setUploadError] = useState('');
    const [rawPasteText, setRawPasteText] = useState('');

    // Chat state
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        {
            role: 'system',
            content: 'Arsenal Online. Your profile data is loaded.\nSend commands to add experience, fix errors, or update skills.',
            timestamp: Date.now(),
        }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Finalize state
    const [isFinalizing, setIsFinalizing] = useState(false);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    // ─── FILE UPLOAD ─────────────────────────────
    const processFile = useCallback(async (file: File) => {
        setUploadError('');
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!['pdf', 'docx'].includes(ext || '')) {
            setUploadError('Only PDF and DOCX files are supported.');
            return;
        }

        try {
            // Step 1: Upload to Supabase storage
            setUploadStatus('uploading');
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const filePath = `${user.id}/${Date.now()}_${file.name}`;
            const { error: uploadErr } = await supabase.storage
                .from('arsenal_uploads')
                .upload(filePath, file);
            if (uploadErr) throw uploadErr;

            // Step 2: Parse the file
            setUploadStatus('parsing');
            const parseRes = await fetch('/api/arsenal/parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath }),
            });
            if (!parseRes.ok) throw new Error('Parse failed');
            const { text: rawText } = await parseRes.json();

            // Step 3: Initialize with AI
            setUploadStatus('initializing');
            const initRes = await fetch('/api/arsenal/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rawText }),
            });
            if (!initRes.ok) throw new Error('AI initialization failed');
            const { resume_text, skill_bank } = await initRes.json();

            setResumeText(resume_text);
            setSkillBank(skill_bank);
            setUploadStatus('done');

            setTimeout(() => setPhase('workspace'), 800);
        } catch (err: any) {
            setUploadStatus('error');
            setUploadError(err.message || 'Upload failed');
        }
    }, []);

    const handleRawTextInit = useCallback(async () => {
        if (!rawPasteText.trim()) return;
        try {
            setUploadStatus('initializing');
            const initRes = await fetch('/api/arsenal/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rawText: rawPasteText }),
            });
            if (!initRes.ok) throw new Error('AI initialization failed');
            const { resume_text, skill_bank } = await initRes.json();

            setResumeText(resume_text);
            setSkillBank(skill_bank);
            setUploadStatus('done');
            setTimeout(() => setPhase('workspace'), 800);
        } catch (err: any) {
            setUploadStatus('error');
            setUploadError(err.message || 'Initialization failed');
        }
    }, [rawPasteText]);

    // Drag handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    };
    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    // ─── CHAT ────────────────────────────────────
    const handleChatSubmit = useCallback(async (e: FormEvent) => {
        e.preventDefault();
        const prompt = chatInput.trim();
        if (!prompt || isThinking) return;

        const userMsg: ChatMessage = { role: 'user', content: prompt, timestamp: Date.now() };
        const newHistory = [...chatHistory, userMsg];
        setChatHistory(newHistory);
        setChatInput('');
        setIsThinking(true);

        try {
            const apiHistory = newHistory
                .filter(m => m.role !== 'system')
                .map(m => ({ role: m.role, content: m.content }));

            const res = await fetch('/api/arsenal/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    currentResumeText: resumeText,
                    currentSkillBank: skillBank,
                    chatHistory: apiHistory,
                }),
            });

            if (!res.ok) throw new Error('Chat failed');
            const data = await res.json();

            if (data.updated_resume_text) setResumeText(data.updated_resume_text);
            if (data.updated_skill_bank) setSkillBank(data.updated_skill_bank);

            const aiMsg: ChatMessage = {
                role: 'assistant',
                content: data.ai_reply || 'Done.',
                timestamp: Date.now(),
            };
            setChatHistory(prev => [...prev, aiMsg]);
        } catch (err: any) {
            setChatHistory(prev => [...prev, {
                role: 'assistant',
                content: `⚠ ERROR: ${err.message}`,
                timestamp: Date.now(),
            }]);
        } finally {
            setIsThinking(false);
            inputRef.current?.focus();
        }
    }, [chatInput, isThinking, chatHistory, resumeText, skillBank]);

    // ─── FINALIZE ────────────────────────────────
    const handleFinalize = useCallback(async () => {
        if (isFinalizing) return;
        setIsFinalizing(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase.from('profiles').upsert({
                id: user.id,
                resume_text: resumeText,
                skill_bank: skillBank,
                onboarding_completed: true,
                updated_at: new Date().toISOString(),
            });

            if (error) throw error;
            window.location.href = '/forge';
        } catch (err: any) {
            alert(`Finalize failed: ${err.message}`);
            setIsFinalizing(false);
        }
    }, [resumeText, skillBank, isFinalizing]);

    // ─── REMOVE SKILL ────────────────────────────
    const removeSkill = (skill: string) => {
        setSkillBank(prev => prev.filter(s => s !== skill));
    };

    // ═══════════════════════════════════════════════
    // PHASE 1: UPLOAD
    // ═══════════════════════════════════════════════
    if (phase === 'upload') {
        return (
            <div className="min-h-screen flex flex-col p-8 max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-12 border-b-2 border-black pb-4">
                    <h1 className="text-6xl font-black tracking-tighter mb-2">
                        THE ARSENAL
                    </h1>
                    <p className="font-mono text-sm opacity-60 uppercase tracking-widest">
                        Asset Initialization // Upload Your Career Data
                    </p>
                </div>

                {/* Upload Zone */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
                        relative border-2 border-dashed
                        p-16 flex flex-col items-center
                        justify-center gap-6
                        transition-all cursor-pointer group
                        ${isDragging
                            ? 'border-black bg-black/5 scale-[1.01]'
                            : 'border-black/30 hover:border-black hover:bg-black/[0.02]'
                        }
                        ${uploadStatus !== 'idle' && uploadStatus !== 'error'
                            ? 'pointer-events-none opacity-60'
                            : ''
                        }
                    `}
                >
                    <input
                        type="file"
                        accept=".pdf,.docx"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleFileInput}
                        disabled={uploadStatus !== 'idle' && uploadStatus !== 'error'}
                    />

                    {uploadStatus === 'idle' || uploadStatus === 'error' ? (
                        <>
                            <UploadCloudIcon className={`w-16 h-16 transition-transform ${isDragging ? 'scale-110' : 'group-hover:scale-105'} opacity-40`} />
                            <div className="text-center">
                                <p className="text-lg font-bold uppercase tracking-wider">
                                    Drop your resume here
                                </p>
                                <p className="font-mono text-xs opacity-50 mt-2">
                                    PDF or DOCX — We'll extract and structure everything
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            {uploadStatus === 'done' ? (
                                <CheckCircleIcon className="w-12 h-12 text-green-600" />
                            ) : (
                                <Loader2Icon className="w-12 h-12 animate-spin opacity-40" />
                            )}
                            <div className="font-mono text-sm uppercase tracking-widest">
                                {uploadStatus === 'uploading' && 'Uploading to vault...'}
                                {uploadStatus === 'parsing' && 'Extracting text...'}
                                {uploadStatus === 'initializing' && 'AI is structuring your profile...'}
                                {uploadStatus === 'done' && 'Profile Ready. Loading workspace...'}
                            </div>
                        </div>
                    )}
                </div>

                {uploadError && (
                    <div className="mt-4 p-4 border-2 border-red-500 bg-red-50 font-mono text-sm text-red-700">
                        ⚠ {uploadError}
                    </div>
                )}

                {/* Divider */}
                <div className="flex items-center gap-4 my-10">
                    <div className="flex-1 h-px bg-black/20" />
                    <span className="font-mono text-xs opacity-40 uppercase">or paste raw text</span>
                    <div className="flex-1 h-px bg-black/20" />
                </div>

                {/* Raw Text Input */}
                <div className="space-y-4">
                    <div className="relative">
                        <div className="absolute -top-3 left-4 bg-[#F4F4F0] px-2 font-mono text-xs font-bold border-2 border-black border-b-0 z-10">
                            RAW RESUME TEXT
                        </div>
                        <textarea
                            value={rawPasteText}
                            onChange={e => setRawPasteText(e.target.value)}
                            className="w-full h-64 p-6 font-mono text-xs leading-relaxed border-2 border-black bg-transparent resize-none focus:outline-none"
                            placeholder="Paste the full text content of your resume here..."
                            disabled={uploadStatus !== 'idle' && uploadStatus !== 'error'}
                        />
                    </div>
                    <button
                        onClick={handleRawTextInit}
                        disabled={!rawPasteText.trim() || (uploadStatus !== 'idle' && uploadStatus !== 'error')}
                        className="w-full h-14 border-2 border-black bg-black text-white font-mono text-sm uppercase tracking-widest hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                    >
                        <SparklesIcon className="w-5 h-5" />
                        Initialize with AI
                    </button>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════
    // PHASE 2: DUAL-PANE WORKSPACE
    // ═══════════════════════════════════════════════
    return (
        <div className="h-screen flex flex-col">
            {/* Top Bar */}
            <div className="h-12 border-b-2 border-black flex items-center px-6 justify-between shrink-0 bg-[#F4F4F0]">
                <div className="flex items-center gap-3">
                    <ShieldCheckIcon className="w-5 h-5" />
                    <span className="font-black text-sm uppercase tracking-widest">
                        The Arsenal
                    </span>
                    <span className="font-mono text-[10px] opacity-40 uppercase">
                        // Interactive Workspace
                    </span>
                </div>
                <button
                    onClick={handleFinalize}
                    disabled={isFinalizing || !resumeText.trim()}
                    className="h-8 px-6 border-2 border-black bg-black text-white text-xs font-mono uppercase tracking-widest hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
                >
                    {isFinalizing ? (
                        <><Loader2Icon className="w-3 h-3 animate-spin" /> Saving...</>
                    ) : (
                        <><CheckCircleIcon className="w-3 h-3" /> Finalize Arsenal</>
                    )}
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">

                {/* ─── LEFT PANE: AI CHAT ─── */}
                <div className="w-[380px] min-w-[320px] border-r-2 border-black bg-black text-white flex flex-col">
                    {/* Chat Header */}
                    <div className="h-8 border-b border-white/20 flex items-center px-3 justify-between shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                            <TerminalIcon className="w-3 h-3" /> ARSENAL_CHAT
                        </span>
                        <div className={`w-2 h-2 ${isThinking ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`} />
                    </div>

                    {/* Chat Messages */}
                    <div className="p-3 flex-1 overflow-auto font-mono text-xs space-y-3">
                        {chatHistory.map((msg, i) => (
                            <div key={i} className={`${
                                msg.role === 'user'
                                    ? 'border-l-2 border-white/40 pl-2'
                                    : msg.role === 'system'
                                        ? 'opacity-50 border-l-2 border-white/20 pl-2'
                                        : 'text-green-400'
                            }`}>
                                {msg.role === 'user' && (
                                    <div className="text-[9px] text-white/40 mb-0.5 uppercase">YOU</div>
                                )}
                                {msg.role === 'assistant' && (
                                    <div className="text-[9px] text-green-400/60 mb-0.5 uppercase">ARSENAL AI</div>
                                )}
                                <div className="whitespace-pre-wrap break-words leading-relaxed">
                                    {msg.content}
                                </div>
                            </div>
                        ))}

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

                    {/* Chat Input */}
                    <form onSubmit={handleChatSubmit} className="p-2 border-t border-white/20 flex items-center gap-2 shrink-0">
                        <span className="text-green-400 text-xs">&gt;_</span>
                        <input
                            ref={inputRef}
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            disabled={isThinking}
                            className="flex-1 bg-transparent outline-none text-xs text-white placeholder:opacity-30 disabled:opacity-50"
                            placeholder={isThinking ? "PROCESSING..." : "Add my internship at Google..."}
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

                {/* ─── RIGHT PANE: DATA DISPLAY ─── */}
                <div className="flex-1 overflow-auto bg-[#F4F4F0] p-8 space-y-8">

                    {/* Resume Text */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <FileTextIcon className="w-5 h-5" />
                            <h2 className="text-xl font-bold uppercase">
                                Resume Data
                            </h2>
                            <span className="font-mono text-[10px] opacity-40 ml-auto">
                                {resumeText.length} CHARS
                            </span>
                        </div>
                        <div className="relative">
                            <div className="absolute -top-3 left-4 bg-[#F4F4F0] px-2 font-mono text-xs font-bold border-2 border-black border-b-0 z-10">
                                RESUME_TEXT
                            </div>
                            <textarea
                                value={resumeText}
                                onChange={e => setResumeText(e.target.value)}
                                className="w-full h-[450px] p-6 font-mono text-xs leading-relaxed border-2 border-black bg-white resize-none focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Skill Bank */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-black flex items-center justify-center font-bold text-xs">#</div>
                            <h2 className="text-xl font-bold uppercase">
                                Skill Bank
                            </h2>
                            <span className="font-mono text-[10px] opacity-40 ml-auto">
                                {skillBank.length} SKILLS
                            </span>
                        </div>
                        <div className="flex gap-2 flex-wrap p-4 border-2 border-black bg-white min-h-[80px]">
                            {skillBank.map((skill) => (
                                <Badge
                                    key={skill}
                                    variant="outline"
                                    className="border-black group cursor-pointer hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors pr-1"
                                    onClick={() => removeSkill(skill)}
                                >
                                    {skill}
                                    <XIcon className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Badge>
                            ))}
                            {skillBank.length === 0 && (
                                <span className="font-mono text-xs opacity-30">
                                    No skills yet — use the chat to add them
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
