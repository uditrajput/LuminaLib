"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronLeft, ChevronRight, BookOpen, Layers, Zap } from "lucide-react";
import Book3DCard from "./Book3DCard";

const featuredBooks = [
  {
    id: 1,
    title: "Quantum Horizons",
    author: "Elara Vance",
    genre: "Sci-Fi Thriller",
    rating: "4.9",
    summary: "An exhilarating leap into quantum mechanics and parallel dimensions. When an experimental lab collapses into a temporal rift, Dr. Vance discovers a consensus continuum where reality recalculates every decision.",
    coverUrl: "/covers/quantum.jpg",
    badge: "Trending #1",
    accentColor: "from-purple-600 to-indigo-600",
  },
  {
    id: 2,
    title: "Neural Architectures",
    author: "Alexis Chen, PhD",
    genre: "Artificial Intelligence",
    rating: "5.0",
    summary: "The definitive masterwork on artificial neural networks, generative AI models, and deep learning consensus mechanisms. Explore how multi-agent architectures achieve human-level reasoning.",
    coverUrl: "/covers/neural.jpg",
    badge: "Editor's Choice",
    accentColor: "from-blue-600 to-cyan-600",
  },
  {
    id: 3,
    title: "The Astral Chronicles",
    author: "Evelyn R. Blackwood",
    genre: "Epic Fantasy",
    rating: "4.8",
    summary: "Deep in the enchanted realm of Eldoria, an ancient dragon binding rune threatens to fracture the moon's magical tether. A gripping tale of honor, arcane spells, and forgotten empires.",
    coverUrl: "/covers/astral.jpg",
    badge: "Top Rated",
    accentColor: "from-emerald-600 to-teal-600",
  },
];

export default function Book3DCarouselSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  const nextBook = () => setActiveIndex((prev) => (prev + 1) % featuredBooks.length);
  const prevBook = () => setActiveIndex((prev) => (prev - 1 + featuredBooks.length) % featuredBooks.length);

  return (
    <section className="relative overflow-hidden py-20 bg-slate-950 text-white rounded-[2.5rem] my-16 shadow-[0_25px_70px_-15px_rgba(15,23,42,0.8)] border border-slate-800/80">
      {/* Dynamic Animated Ambient Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-blue-600/20 via-violet-600/20 to-cyan-500/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Grid Pattern Accent */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-25 pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-extrabold uppercase tracking-widest mb-4 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span>Interactive 3D Experience</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black tracking-tight mb-4"
          >
            Touch & Explore <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 drop-shadow-[0_0_25px_rgba(99,102,241,0.5)]">
              Next-Gen 3D Volumes
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-base md:text-lg font-light leading-relaxed"
          >
            Hover to tilt in full 3D perspective. Click any hardcover to open the volume and reveal instant AI summaries, reviews, and structural insights.
          </motion.p>
        </div>

        {/* 3D Floating Book Gallery Stack */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center py-6">
          {featuredBooks.map((book, idx) => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: idx * 0.15 + 0.3,
                y: {
                  duration: 4 + idx,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }}

            >
              <Book3DCard
                title={book.title}
                author={book.author}
                genre={book.genre}
                rating={book.rating}
                summary={book.summary}
                coverUrl={book.coverUrl}
                badge={book.badge}
                accentColor={book.accentColor}
              />
            </motion.div>
          ))}
        </div>

        {/* Feature Badges Below */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <Layers className="h-5 w-5" />
            </div>
            <div className="text-left">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">3D Depth Rendering</h4>
              <p className="text-[11px] text-slate-400">Realistic spine & page thickness</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="p-2 rounded-xl bg-violet-500/20 text-violet-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="text-left">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Page Flip Simulation</h4>
              <p className="text-[11px] text-slate-400">Interactive cover opening</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
              <Zap className="h-5 w-5" />
            </div>
            <div className="text-left">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Instant Vector RAG</h4>
              <p className="text-[11px] text-slate-400">Deep semantic Q&A per volume</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
