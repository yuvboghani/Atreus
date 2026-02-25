"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Github, Terminal, Shield, Cpu } from "lucide-react";
import { PipelineAnimation } from "@/components/landing/pipeline-animation";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F4F4F0] text-[#111111] overflow-x-hidden">

      {/* ═══════════════════════════════════════════ */}
      {/* HERO SECTION                               */}
      {/* ═══════════════════════════════════════════ */}
      <section className="relative px-8 pt-20 pb-16 md:pt-32 md:pb-24">

        {/* Grid overlay pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `repeating-linear-gradient(0deg, #000 0px, #000 1px, transparent 1px, transparent 40px),
                           repeating-linear-gradient(90deg, #000 0px, #000 1px, transparent 1px, transparent 40px)`,
        }} />

        <div className="relative max-w-[1200px] mx-auto">
          {/* System status */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3 mb-8 font-mono text-xs"
          >
            <motion.div
              className="w-2 h-2 bg-black"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="tracking-[0.3em] uppercase opacity-50">
              System Status: Online
            </span>
            <div className="w-[2px] h-4 bg-black/20 mx-2" />
            <span className="tracking-[0.3em] uppercase opacity-50">
              v0.9.0-alpha
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-6"
          >
            PROJECT
            <br />
            <span className="inline-flex items-baseline gap-4">
              ATREUS
              <span className="text-lg md:text-2xl font-mono tracking-widest opacity-40 align-baseline">
                //
              </span>
            </span>
            <br />
            <span className="text-2xl md:text-4xl font-mono tracking-tight opacity-60 leading-normal">
              AUTONOMOUS CAREER OS
            </span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="max-w-[700px] text-base md:text-lg font-mono leading-relaxed opacity-70 mb-12"
          >
            A multi-agent data pipeline that ingests raw job descriptions,
            aligns your master skill bank, and compiles targeted LaTeX resumes
            in real-time.
          </motion.p>

          {/* Stat badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap gap-4"
          >
            {[
              { icon: <Cpu className="w-4 h-4" />, label: "GLM-4-PLUS AI" },
              { icon: <Shield className="w-4 h-4" />, label: "SERVICE-ROLE AUTH" },
              { icon: <Terminal className="w-4 h-4" />, label: "LATEX COMPILER" },
            ].map((badge, i) => (
              <motion.div
                key={badge.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="flex items-center gap-2 border-2 border-black px-4 py-2 font-mono text-[11px] tracking-widest uppercase"
              >
                {badge.icon}
                {badge.label}
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Decorative border */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black" />
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* PIPELINE ANIMATION SECTION                 */}
      {/* ═══════════════════════════════════════════ */}
      <section className="px-8 py-16 md:py-24">
        <div className="max-w-[1200px] mx-auto">
          <PipelineAnimation />
        </div>
      </section>

      {/* Separator */}
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="h-[2px] bg-black" />
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* TERMINAL DEMO SECTION                      */}
      {/* ═══════════════════════════════════════════ */}
      <section className="px-8 py-16 md:py-24">
        <div className="max-w-[1200px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="border-2 border-black bg-black text-[#F4F4F0] p-6 md:p-8 font-mono text-xs md:text-sm"
          >
            {/* Terminal header */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/20">
              <Terminal className="w-4 h-4" />
              <span className="text-[10px] tracking-[0.3em] uppercase opacity-60">
                atreus_os — live session
              </span>
            </div>

            {/* Terminal lines */}
            {[
              { prompt: "$ ingest", text: '"Senior Backend Eng @ Palantir — Go, K8s, gRPC"', delay: 0.1 },
              { prompt: "→ radar", text: "AI extraction complete: title, company, salary, tech_stack ✓", delay: 0.3 },
              { prompt: "→ arsenal", text: "Loaded master resume (2,847 tokens) + skill_bank (42 entries)", delay: 0.5 },
              { prompt: "→ forge", text: '"The Surgeon" routing: gap_analysis → section_rewrite → compile', delay: 0.7 },
              { prompt: "✓ output", text: "tailored_resume_palantir_v1.pdf — 94% match score", delay: 0.9 },
            ].map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: line.delay, duration: 0.3 }}
                className="flex gap-3 mb-3 last:mb-0"
              >
                <span className={`flex-shrink-0 ${i === 4 ? "text-green-400" : "opacity-50"}`}>
                  {line.prompt}
                </span>
                <span className={i === 4 ? "text-green-400 font-bold" : ""}>{line.text}</span>
              </motion.div>
            ))}

            {/* Blinking cursor */}
            <motion.span
              className="inline-block w-2 h-4 bg-[#F4F4F0] mt-4"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </motion.div>
        </div>
      </section>

      {/* Separator */}
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="h-[2px] bg-black" />
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* CALL TO ACTION                              */}
      {/* ═══════════════════════════════════════════ */}
      <section className="px-8 py-16 md:py-24">
        <div className="max-w-[1200px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="font-mono text-[10px] tracking-[0.3em] uppercase opacity-50 mb-2">
              Ready to Deploy
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter">
              ENTER THE SYSTEM
            </h2>
          </motion.div>

          <div className="flex flex-col md:flex-row gap-4 max-w-[800px] mx-auto">
            {/* INITIALIZE button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="flex-1"
            >
              <Link href="/login" className="block">
                <div className="border-2 border-black bg-black text-[#F4F4F0] p-6 md:p-8 text-center font-black text-xl md:text-2xl tracking-widest uppercase cursor-pointer hover:bg-[#F4F4F0] hover:text-black transition-colors duration-300 group">
                  <div className="flex items-center justify-center gap-3">
                    <Terminal className="w-6 h-6" />
                    <span>INITIALIZE</span>
                    <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
                  </div>
                  <div className="font-mono text-[10px] tracking-widest mt-2 opacity-50 font-normal">
                    Launch the Forge Workspace
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* VIEW GITHUB button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex-1"
            >
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <div className="border-2 border-black bg-[#F4F4F0] text-black p-6 md:p-8 text-center font-black text-xl md:text-2xl tracking-widest uppercase cursor-pointer hover:bg-black hover:text-[#F4F4F0] transition-colors duration-300 group">
                  <div className="flex items-center justify-center gap-3">
                    <Github className="w-6 h-6" />
                    <span>VIEW GITHUB</span>
                    <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
                  </div>
                  <div className="font-mono text-[10px] tracking-widest mt-2 opacity-50 font-normal">
                    Explore the Source Code
                  </div>
                </div>
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* FOOTER                                      */}
      {/* ═══════════════════════════════════════════ */}
      <footer className="border-t-2 border-black px-8 py-8">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 font-mono text-[10px] tracking-[0.2em] uppercase opacity-40">
          <span>Project Atreus — Autonomous Career OS</span>
          <span>Direct Drive Architecture // v0.9.0</span>
        </div>
      </footer>
    </div>
  );
}
