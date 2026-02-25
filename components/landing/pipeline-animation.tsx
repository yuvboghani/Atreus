"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Radio, Database, Hammer, Zap, ArrowRight } from "lucide-react";

/* ─── Data Packet ─── */
function DataPacket({ delay }: { delay: number }) {
    return (
        <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-black"
            initial={{ left: "0%", opacity: 0 }}
            animate={{
                left: ["0%", "100%"],
                opacity: [0, 1, 1, 0],
            }}
            transition={{
                duration: 2,
                delay,
                repeat: Infinity,
                repeatDelay: 1.5,
                ease: "linear",
            }}
        />
    );
}

/* ─── Connector Line ─── */
function DataLine() {
    return (
        <div className="hidden md:flex flex-1 items-center relative h-[2px] mx-2">
            <div className="absolute inset-0 bg-black/20" />
            <DataPacket delay={0} />
            <DataPacket delay={1.2} />
            <DataPacket delay={2.4} />
        </div>
    );
}

/* ─── Mobile Arrow ─── */
function MobileArrow() {
    return (
        <div className="flex md:hidden justify-center py-4">
            <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
            >
                <ArrowRight className="w-6 h-6 rotate-90" />
            </motion.div>
        </div>
    );
}

/* ─── Pipeline Node ─── */
interface NodeProps {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    details: string[];
    index: number;
}

function PipelineNode({ icon, title, subtitle, details, index }: NodeProps) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: index * 0.2 }}
            className="flex-1 min-w-[280px]"
        >
            <div className="border-2 border-black bg-[#F4F4F0] p-6 h-full group hover:bg-black hover:text-[#F4F4F0] transition-colors duration-300">
                {/* Node Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 border-2 border-current flex items-center justify-center">
                        {icon}
                    </div>
                    <div>
                        <div className="font-black text-sm tracking-widest uppercase">
                            {title}
                        </div>
                        <div className="text-[10px] font-mono opacity-60 tracking-wider uppercase">
                            {subtitle}
                        </div>
                    </div>
                </div>

                {/* Separator */}
                <div className="w-full h-[2px] bg-current opacity-20 mb-4" />

                {/* Details */}
                <div className="space-y-2 font-mono text-xs">
                    {details.map((line, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={isInView ? { opacity: 1, x: 0 } : {}}
                            transition={{ duration: 0.3, delay: index * 0.2 + i * 0.1 + 0.3 }}
                            className="flex items-start gap-2"
                        >
                            <Zap className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span className="opacity-80">{line}</span>
                        </motion.div>
                    ))}
                </div>

                {/* Status indicator */}
                <div className="mt-6 flex items-center gap-2">
                    <motion.div
                        className="w-2 h-2 bg-current"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                    <span className="font-mono text-[10px] uppercase tracking-widest opacity-50">
                        System Active
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

/* ─── Main Export ─── */
export function PipelineAnimation() {
    const nodes = [
        {
            icon: <Radio className="w-5 h-5" />,
            title: "THE RADAR",
            subtitle: "Job Intelligence Grid",
            details: [
                "ATS-grade URL & text ingestion",
                "GLM-4-Plus AI normalization",
                "Tech stack, salary, & location extraction",
                "Real-time match scoring engine",
            ],
        },
        {
            icon: <Database className="w-5 h-5" />,
            title: "THE ARSENAL",
            subtitle: "Profile & Assets",
            details: [
                "Master resume LaTeX storage",
                "Skill bank vectorization",
                "Section-level diff engine",
                "Resume version control",
            ],
        },
        {
            icon: <Hammer className="w-5 h-5" />,
            title: "THE FORGE",
            subtitle: "Workspace & Compilation",
            details: [
                '"The Surgeon" AI resume tailoring',
                "Gap analysis & skill injection",
                "Cover letter generation",
                "LaTeX → PDF compilation pipeline",
            ],
        },
    ];

    return (
        <div className="w-full">
            {/* Section Header */}
            <div className="mb-12">
                <div className="font-mono text-[10px] tracking-[0.3em] uppercase opacity-50 mb-2">
                    System Architecture
                </div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tighter">
                    THE PIPELINE
                </h2>
                <div className="w-16 h-[2px] bg-black mt-4" />
            </div>

            {/* Pipeline Flow — Desktop horizontal, Mobile vertical */}
            <div className="flex flex-col md:flex-row md:items-stretch">
                <PipelineNode {...nodes[0]} index={0} />
                <DataLine />
                <MobileArrow />
                <PipelineNode {...nodes[1]} index={1} />
                <DataLine />
                <MobileArrow />
                <PipelineNode {...nodes[2]} index={2} />
            </div>

            {/* Flow label */}
            <motion.div
                className="mt-8 text-center font-mono text-xs opacity-40 tracking-widest uppercase"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 0.4 }}
                transition={{ delay: 1.2 }}
            >
                ── Continuous Data Flow ──
            </motion.div>
        </div>
    );
}
