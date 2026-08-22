"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, Send, BookOpen, CheckCircle2, MessageSquare, Terminal } from "lucide-react";

const sampleQueries = [
  {
    q: "What is the core premise of Quantum Horizons?",
    a: "Quantum Horizons explores Dr. Vance's discovery of a consensus continuum, where reality recalculates decisions dynamically at subatomic scales.",
    tokens: "Vector Match: 98.4%",
  },
  {
    q: "Summarize Neural Architectures chapter on Multi-Agent consensus.",
    a: "Multi-agent systems utilize rolling voting consensus to synthesize high-confidence outputs across decentralized LLM nodes with sub-second latency.",
    tokens: "Vector Match: 99.1%",
  },
  {
    q: "How does LuminaLib process PDF document chunks?",
    a: "PDFs are automatically parsed, stripped of raw formatting, chunked into 500-token semantic embeddings, and stored in pgvector for instant RAG queries.",
    tokens: "Vector Match: 97.8%",
  },
];

export default function LivePreview3DSection() {
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <section className="relative py-20 mb-20 px-4 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-3"
        >
          <Brain className="h-3.5 w-3.5" />
          <span>Live Vector Sandbox</span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight"
        >
          Converse with Books in <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600">
            Real-Time Semantic AI
          </span>
        </motion.h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-base font-medium">
          Select a prompt below to see Lumina's RAG vector engine synthesize instant answers from 3D indexed volumes.
        </p>
      </div>

      {/* 3D Glass Sandbox Terminal Container */}
      <motion.div
        whileHover={{ rotateX: 2, rotateY: -2 }}
        style={{ transformStyle: "preserve-3d" }}
        className="perspective-1200 relative bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-10 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.7)] text-white overflow-hidden"
      >
        {/* Glow ambient background inside card */}
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-blue-600/20 blur-3xl rounded-full pointer-events-none" />

        {/* Top Control Bar */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Lumina RAG Vector Engine v2.4</h3>
              <p className="text-xs text-slate-400">pgvector • HNSW Index • Gemini Flash 2.0</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            Active Vector Index
          </span>
        </div>

        {/* Sample Prompt Selector Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
          {sampleQueries.map((item, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeIdx === i
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-extrabold"
                  : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Prompt #{i + 1}
            </button>
          ))}
        </div>

        {/* Question & Streamed Answer Display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIdx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* User Question */}
            <div className="flex items-start gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60">
              <div className="p-2 rounded-xl bg-blue-500 text-white font-bold text-xs shrink-0">
                You
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-100">{sampleQueries[activeIdx].q}</p>
              </div>
            </div>

            {/* AI Vector Response */}
            <div className="flex items-start gap-4 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-800/40 p-5 rounded-2xl border border-indigo-500/30 shadow-inner">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shrink-0 shadow-lg">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-blue-400 uppercase tracking-wider">Lumina AI Response</span>
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    {sampleQueries[activeIdx].tokens}
                  </span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed font-medium">
                  {sampleQueries[activeIdx].a}
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
