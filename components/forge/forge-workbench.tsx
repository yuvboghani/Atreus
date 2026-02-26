'use client';

import { useState, useCallback, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CrosshairIcon, CpuIcon, FileTextIcon, CheckIcon, DownloadIcon, XIcon, Loader2Icon, AlertTriangleIcon, ShieldCheckIcon, ShieldAlertIcon } from "lucide-react";
import { syncToArsenal } from "@/app/actions/sync-arsenal";

interface ForgeWorkbenchProps {
    job: any;
    currentLatex: string;
    skillBank: string[];
    applicationId?: string;
    onInjectSkill?: (skill: string) => void;
    onRejectSkill?: (skill: string) => void;
    onBatchSkillUpdate?: (injections: string[], rejections: string[]) => void;
}

export function ForgeWorkbench({
    job,
    currentLatex,
    skillBank,
    applicationId,
    onInjectSkill,
    onRejectSkill,
    onBatchSkillUpdate
}: ForgeWorkbenchProps) {
    const [mode, setMode] = useState<'working' | 'confirming'>('working');
    const [loading, setLoading] = useState(false);

    // === BATCH STAGING STATE ===
    const [stagedInjections, setStagedInjections] = useState<string[]>([]);
    const [stagedRejections, setStagedRejections] = useState<string[]>([]);

    const toggleInjection = (skill: string) => {
        setStagedInjections(prev =>
            prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
        );
    };

    const toggleRejection = (skill: string) => {
        setStagedRejections(prev =>
            prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
        );
    };

    const handleBatchExecute = () => {
        if (onBatchSkillUpdate) {
            onBatchSkillUpdate(stagedInjections, stagedRejections);
            setStagedInjections([]);
            setStagedRejections([]);
        }
    };

    // LaTeX compilation state
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isCompiling, setIsCompiling] = useState(false);
    const [compileError, setCompileError] = useState<string | null>(null);

    // === STEP 3: GAP ANALYSIS — Intersection math ===
    const { acquiredSkills, missingSkills } = useMemo(() => {
        const jobTechStack: string[] = job.metadata?.tech_stack || [];
        const userSkills = skillBank || [];

        // Normalize for case-insensitive comparison
        const userSkillsLower = new Set(userSkills.map((s: string) => s.toLowerCase().trim()));

        const acquired: string[] = [];
        const missing: string[] = [];

        jobTechStack.forEach((skill: string) => {
            if (userSkillsLower.has(skill.toLowerCase().trim())) {
                acquired.push(skill);
            } else {
                missing.push(skill);
            }
        });

        return { acquiredSkills: acquired, missingSkills: missing };
    }, [job.metadata?.tech_stack, skillBank]);

    const handleCompile = useCallback(async () => {
        setIsCompiling(true);
        setCompileError(null);
        setPdfUrl(null);

        try {
            const response = await fetch('/api/compile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latexString: currentLatex }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.details || errorData.error || `Compilation failed (${response.status})`);
            }

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            setPdfUrl(objectUrl);
        } catch (err: any) {
            setCompileError(err.message || 'Compilation failed');
        } finally {
            setIsCompiling(false);
        }
    }, [currentLatex]);

    // Sync Button Sub-component
    const SyncButton = ({ text }: { text: string }) => {
        const [synced, setSynced] = useState(false);
        const handleSync = async (e: React.MouseEvent) => {
            e.stopPropagation();
            try {
                await syncToArsenal(text);
                setSynced(true);
            } catch (err) {
                console.error(err);
            }
        };

        if (synced) {
            return (
                <Button size="sm" variant="outline" className="h-6 text-[10px] bg-black text-white border-black transition-none pointer-events-none">
                    SYNCED
                </Button>
            );
        }

        return (
            <Button
                size="sm"
                variant="outline"
                onClick={handleSync}
                className="h-6 text-[10px] border-black hover:bg-black hover:text-white transition-none opacity-0 group-hover:opacity-100"
            >
                ^ PUSH TO ARSENAL
            </Button>
        );
    };

    const handleExport = () => {
        console.log("Downloading assets...");
        window.open(job.url, '_blank');
        setMode('confirming');
    };

    const handleConfirmApplied = async () => {
        setLoading(true);
        try {
            await markJobAsApplied(job.id);
            setMode('working');
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const totalSkills = acquiredSkills.length + missingSkills.length;
    const coveragePercent = totalSkills > 0
        ? Math.round((acquiredSkills.length / totalSkills) * 100)
        : 0;

    return (
        <div className="h-full flex flex-col bg-background">
            {mode === 'confirming' ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-black text-white text-center space-y-8 animate-in fade-in duration-300">
                    <div className="font-mono text-xs opacity-60">SYSTEM INTERCEPT // EXPORT DETECTED</div>
                    <div className="text-4xl font-black tracking-tighter max-w-lg leading-tight">
                        MATERIALS EXPORTED. AWAITING SUBMISSION CONFIRMATION.
                    </div>
                    <div className="flex gap-4">
                        <Button
                            onClick={handleConfirmApplied}
                            disabled={loading}
                            className="bg-white text-black hover:bg-white/90 h-14 px-8 font-mono text-lg border-2 border-transparent"
                        >
                            {loading ? "UPDATING..." : "MARK AS APPLIED"}
                        </Button>
                        <Button
                            onClick={() => setMode('working')}
                            variant="outline"
                            className="text-white border-white hover:bg-white hover:text-black h-14 px-8 font-mono text-lg"
                        >
                            STILL DRAFTING
                        </Button>
                    </div>
                </div>
            ) : (
                <Tabs defaultValue="target" className="flex-1 flex flex-col p-0">
                    <div className="border-b-2 border-black px-4 py-2 bg-muted/5">
                        <TabsList className="w-full justify-start gap-4 border-0 p-0 h-auto rounded-none">
                            <TabsTrigger value="target" className="data-[state=active]:bg-black data-[state=active]:text-white border-2 border-transparent data-[state=active]:border-black px-4 py-1 text-xs font-bold uppercase">Target</TabsTrigger>
                            <TabsTrigger value="payload" className="data-[state=active]:bg-black data-[state=active]:text-white border-2 border-transparent data-[state=active]:border-black px-4 py-1 text-xs font-bold uppercase">Payload</TabsTrigger>
                            <TabsTrigger value="pitch" className="data-[state=active]:bg-black data-[state=active]:text-white border-2 border-transparent data-[state=active]:border-black px-4 py-1 text-xs font-bold uppercase">Pitch</TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-hidden relative bg-white">

                        {/* ====== TARGET TAB — 2-Column Grid: RAW INTEL + GAP ANALYSIS ====== */}
                        <TabsContent value="target" className="h-full m-0 p-0 border-0 shadow-none">
                            <div className="h-full grid grid-cols-2 gap-0">

                                {/* LEFT COLUMN: RAW INTEL */}
                                <div className="h-full flex flex-col border-r-2 border-black">
                                    <div className="h-10 border-b-2 border-black flex items-center px-4 bg-[#F4F4F0] shrink-0">
                                        <span className="text-[10px] font-black uppercase tracking-widest">[ RAW INTEL // JOB DESCRIPTION ]</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 140px)' }}>
                                        <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-[#333] break-words">
                                            {job.raw_description || "NO DATA INGESTED"}
                                        </pre>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: GAP ANALYSIS */}
                                <div className="h-full flex flex-col">
                                    <div className="h-10 border-b-2 border-black flex items-center px-4 bg-[#F4F4F0] shrink-0 justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest">[ GAP ANALYSIS // SKILL OVERLAP ]</span>
                                        {totalSkills > 0 && (
                                            <span className="text-[10px] font-mono font-bold">
                                                {coveragePercent}% COVERAGE
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-6" style={{ maxHeight: 'calc(100vh - 140px)' }}>

                                        {totalSkills === 0 ? (
                                            /* Empty state — no tech stack or skills */
                                            <div className="border-2 border-black border-dashed p-6 text-center">
                                                <div className="font-black text-sm uppercase tracking-widest mb-2">NO INTEL AVAILABLE</div>
                                                <div className="text-[10px] font-mono opacity-60 leading-relaxed">
                                                    Job tech_stack not detected or Arsenal skill_bank empty.
                                                    <br />Seed your Arsenal with skills to enable gap analysis.
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {/* ACQUIRED ASSETS */}
                                                <div>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <ShieldCheckIcon className="w-4 h-4" />
                                                        <h3 className="text-xs font-black uppercase tracking-widest">ACQUIRED ASSETS</h3>
                                                        <span className="text-[10px] font-mono opacity-50">({acquiredSkills.length})</span>
                                                    </div>
                                                    {acquiredSkills.length > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {acquiredSkills.map((skill) => {
                                                                const isStaged = stagedRejections.includes(skill);
                                                                return (
                                                                    <span
                                                                        key={skill}
                                                                        className={`flex items-center text-[11px] font-mono font-bold pl-3 border-2 border-black uppercase tracking-wider transition-colors ${isStaged ? 'bg-white text-black' : 'bg-black text-white'
                                                                            }`}
                                                                    >
                                                                        {skill}
                                                                        <button
                                                                            onClick={() => toggleRejection(skill)}
                                                                            className={`ml-2 px-2 border-l-2 border-black transition-colors ${isStaged ? 'bg-black text-white' : 'hover:bg-white hover:text-black'
                                                                                }`}
                                                                            title={isStaged ? "UNDO REJECTION" : "REJECT SKILL"}
                                                                        >
                                                                            {isStaged ? "[UNDO]" : "[-]"}
                                                                        </button>
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="text-[10px] font-mono opacity-40 border-2 border-dashed border-black/20 p-3">
                                                            No matching skills detected in your Arsenal.
                                                        </div>
                                                    )}
                                                </div>

                                                {/* DIVIDER */}
                                                <div className="border-t-2 border-black" />

                                                {/* MISSING INTEL */}
                                                <div>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <ShieldAlertIcon className="w-4 h-4 text-red-600" />
                                                        <h3 className="text-xs font-black uppercase tracking-widest">MISSING INTEL</h3>
                                                        <span className="text-[10px] font-mono text-red-600">({missingSkills.length})</span>
                                                    </div>
                                                    {missingSkills.length > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {missingSkills.map((skill) => {
                                                                const isStaged = stagedInjections.includes(skill);
                                                                return (
                                                                    <span
                                                                        key={skill}
                                                                        className={`flex items-center text-[11px] font-mono font-bold pl-3 border-2 border-black uppercase tracking-wider transition-colors ${isStaged ? 'bg-black text-white' : 'bg-transparent text-red-600'
                                                                            }`}
                                                                    >
                                                                        {skill}
                                                                        <button
                                                                            onClick={() => toggleInjection(skill)}
                                                                            className={`ml-2 px-2 border-l-2 border-black transition-colors ${isStaged ? 'bg-white text-black' : 'hover:bg-black hover:text-white'
                                                                                }`}
                                                                            title={isStaged ? "UNDO INJECTION" : "INJECT SKILL"}
                                                                        >
                                                                            {isStaged ? "[UNDO]" : "[+]"}
                                                                        </button>
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="text-[10px] font-mono text-green-700 border-2 border-green-700 p-3 font-bold">
                                                            ✓ FULL COVERAGE — All required skills acquired.
                                                        </div>
                                                    )}
                                                </div>

                                                {/* BATCH EXECUTION BUTTON */}
                                                {(stagedInjections.length > 0 || stagedRejections.length > 0) && (
                                                    <button
                                                        onClick={handleBatchExecute}
                                                        className="w-full mt-4 p-4 border-2 border-black bg-black text-white hover:bg-[#F4F4F0] hover:text-black uppercase font-mono font-black tracking-widest text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                                                    >
                                                        [ EXECUTE SKILL OVERRIDE ]
                                                        <div className="text-[9px] font-normal mt-1 opacity-70">
                                                            {stagedInjections.length > 0 && `+${stagedInjections.length} INJECTION `}
                                                            {stagedRejections.length > 0 && `-${stagedRejections.length} REJECTION`}
                                                        </div>
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </TabsContent>

                        {/* ====== PAYLOAD TAB ====== */}
                        <TabsContent value="payload" className="h-full m-0 p-0 border-0 shadow-none">
                            <div className="p-4 h-full overflow-auto">
                                <div className="flex items-center gap-3 mb-4">
                                    <CpuIcon className="w-6 h-6" />
                                    <h2 className="text-2xl font-black uppercase">LaTeX Source</h2>
                                </div>
                                <div className="border-2 border-black bg-[#1a1a1a] text-green-400 p-4 font-mono text-xs whitespace-pre-wrap leading-relaxed overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                                    {currentLatex}
                                </div>
                            </div>
                        </TabsContent>

                        {/* ====== PITCH TAB ====== */}
                        <TabsContent value="pitch" className="h-full m-0 p-0 border-0 shadow-none">
                            <div className="h-full flex flex-col">
                                {/* Compile Button Bar */}
                                <div className="p-4 border-b-2 border-black bg-muted/5">
                                    <button
                                        onClick={handleCompile}
                                        disabled={isCompiling}
                                        className="w-full border-2 border-black bg-black text-white py-4 px-6 font-black text-lg uppercase tracking-widest hover:bg-[#F4F4F0] hover:text-black transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                    >
                                        {isCompiling ? (
                                            <>
                                                <Loader2Icon className="w-5 h-5 animate-spin" />
                                                COMPILING BINARY...
                                            </>
                                        ) : (
                                            <>
                                                <FileTextIcon className="w-5 h-5" />
                                                COMPILE BINARY PDF
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Content Area */}
                                <div className="flex-1 overflow-auto p-4">
                                    {/* Error State */}
                                    {compileError && (
                                        <div className="border-2 border-red-600 bg-red-50 p-4 mb-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <AlertTriangleIcon className="w-4 h-4 text-red-600" />
                                                <span className="font-black text-xs uppercase tracking-widest text-red-600">
                                                    COMPILATION FAILED
                                                </span>
                                                <button
                                                    onClick={() => setCompileError(null)}
                                                    className="ml-auto"
                                                >
                                                    <XIcon className="w-4 h-4 text-red-600" />
                                                </button>
                                            </div>
                                            <pre className="text-xs font-mono text-red-800 whitespace-pre-wrap break-words max-h-[200px] overflow-auto">
                                                {compileError}
                                            </pre>
                                        </div>
                                    )}

                                    {/* PDF Viewer */}
                                    {pdfUrl && (
                                        <div className="h-full min-h-[500px]">
                                            <iframe
                                                src={pdfUrl}
                                                className="w-full h-full border-2 border-black"
                                                style={{ minHeight: '500px' }}
                                                title="Compiled PDF"
                                            />
                                        </div>
                                    )}

                                    {/* Default State */}
                                    {!pdfUrl && !isCompiling && !compileError && (
                                        <div>
                                            <div className="flex items-center gap-3 mb-6">
                                                <FileTextIcon className="w-6 h-6" />
                                                <h2 className="text-2xl font-black uppercase">Output</h2>
                                            </div>
                                            <div className="border-2 border-black p-8 min-h-[400px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] font-mono whitespace-pre-wrap text-xs leading-relaxed bg-[#1a1a1a] text-green-400">
                                                {currentLatex.substring(0, 500)}...
                                                {'\n\n'}[CLICK COMPILE BINARY PDF TO RENDER]
                                            </div>
                                            <div className="mt-8 flex justify-end gap-4">
                                                <Button
                                                    onClick={handleExport}
                                                    className="bg-black text-white hover:bg-black/80 h-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                                >
                                                    <DownloadIcon className="mr-2 h-4 w-4" /> EXPORT & APPLY
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Compiling State */}
                                    {isCompiling && !pdfUrl && (
                                        <div className="flex-1 flex flex-col items-center justify-center py-20">
                                            <div className="border-2 border-black p-8 text-center">
                                                <Loader2Icon className="w-8 h-8 animate-spin mx-auto mb-4" />
                                                <div className="font-black text-lg uppercase tracking-widest mb-2">
                                                    COMPILING BINARY...
                                                </div>
                                                <div className="font-mono text-xs opacity-60">
                                                    Sending LaTeX to external compiler → Awaiting PDF response
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            )}
        </div>
    );
}

import { markJobAsApplied } from "@/app/actions/update-status";
