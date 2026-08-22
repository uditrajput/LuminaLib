"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Library, ArrowUpRight, BookOpen, Star, UserPlus, Flame } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import Canvas3DParticles from "./Canvas3DParticles";

export default function Hero3DScene() {
  const { isAuthenticated, isLoading } = useAuth();
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRotateY((x / rect.width) * 16);
    setRotateX((-y / rect.height) * 12);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <section
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 px-6 py-24 md:py-36 mb-20 shadow-[0_30px_90px_-20px_rgba(15,23,42,0.9)] border border-slate-800/80 perspective-1200 transition-all"
    >
      {/* 3D Dynamic Particle Background Canvas */}
      <Canvas3DParticles />

      {/* Ambient Gradient Glow Orbs */}
      <div className="absolute top-[-30%] right-[-15%] w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-blue-600/30 via-indigo-500/25 to-purple-800/30 blur-[130px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-30%] left-[-15%] w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-cyan-500/20 via-blue-600/20 to-violet-900/30 blur-[130px] pointer-events-none" />

      {/* 3D Floating Book Left Showcase */}
      <motion.div
        animate={{
          rotateY: rotateY * 1.5 + 20,
          rotateX: rotateX * 1.5 - 10,
          y: [0, -15, 0],
        }}
        transition={{
          rotateY: { type: "spring", stiffness: 150, damping: 15 },
          rotateX: { type: "spring", stiffness: 150, damping: 15 },
          y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
        }}
        style={{ transformStyle: "preserve-3d" }}
        className="hidden lg:block absolute left-8 top-28 w-44 h-64 rounded-r-2xl rounded-l-xs overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-white/20 z-10 pointer-events-none"
      >
        <img src="/covers/quantum.jpg" alt="3D Sci-Fi Book" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-white/10 p-3 flex flex-col justify-between">
          <span className="self-start text-[9px] font-black uppercase tracking-wider text-white bg-blue-600/80 px-2 py-0.5 rounded-md backdrop-blur-md">
            Sci-Fi 3D
          </span>
          <p className="text-xs font-bold text-white leading-tight">Quantum Horizons</p>
        </div>
      </motion.div>

      {/* 3D Floating Book Right Showcase */}
      <motion.div
        animate={{
          rotateY: rotateY * 1.5 - 25,
          rotateX: rotateX * 1.5 + 8,
          y: [0, 15, 0],
        }}
        transition={{
          rotateY: { type: "spring", stiffness: 150, damping: 15 },
          rotateX: { type: "spring", stiffness: 150, damping: 15 },
          y: { duration: 5.5, repeat: Infinity, ease: "easeInOut" },
        }}
        style={{ transformStyle: "preserve-3d" }}
        className="hidden lg:block absolute right-8 top-36 w-44 h-64 rounded-r-2xl rounded-l-xs overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-white/20 z-10 pointer-events-none"
      >
        <img src="/covers/neural.jpg" alt="3D AI Book" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-white/10 p-3 flex flex-col justify-between">
          <span className="self-start text-[9px] font-black uppercase tracking-wider text-white bg-violet-600/80 px-2 py-0.5 rounded-md backdrop-blur-md">
            AI Volume
          </span>
          <p className="text-xs font-bold text-white leading-tight">Neural Architectures</p>
        </div>
      </motion.div>

      {/* Main 3D Centered Hero Content */}
      <motion.div
        animate={{
          rotateX: rotateX,
          rotateY: rotateY,
        }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center space-y-8"
      >
        {/* Floating 3D Badge */}
        <motion.div
          whileHover={{ scale: 1.08, translateZ: 30 }}
          className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-blue-200 backdrop-blur-xl border border-blue-400/40 shadow-[0_0_30px_rgba(59,130,246,0.35)] cursor-pointer"
        >
          <Sparkles className="h-4 w-4 text-blue-400 animate-spin" style={{ animationDuration: "6s" }} />
          <span className="tracking-wide uppercase text-xs font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-200">
            Next Generation AI & 3D Library
          </span>
        </motion.div>

        {/* 3D Main Title */}
        <h1
          style={{ transform: "translateZ(40px)" }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white leading-[1.05] drop-shadow-2xl"
        >
          Experience Books in <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 drop-shadow-[0_0_45px_rgba(99,102,241,0.6)]">
            Three Dimensions
          </span>
        </h1>

        {/* Subtitle */}
        <p
          style={{ transform: "translateZ(30px)" }}
          className="text-lg md:text-2xl text-slate-300 max-w-2xl font-light leading-relaxed drop-shadow"
        >
          Read, analyze, and converse with documents using advanced <strong className="text-white font-bold">Semantic AI</strong>. LuminaLib turns static books into living 3D intelligence.
        </p>

        {/* ── 3D Interactive Action Buttons ── */}
        <div
          style={{ transform: "translateZ(50px)" }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6 w-full sm:w-auto z-20"
        >
          {/* 🌐 Explore Library 3D Button */}
          <Link href="/books" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.05, y: -4, rotateX: 5 }}
              whileTap={{ scale: 0.98 }}
              className="relative group h-16 w-full sm:w-auto px-10 rounded-2xl bg-white text-slate-950 font-black text-base shadow-[0_15px_35px_rgba(255,255,255,0.25)] hover:shadow-[0_20px_50px_rgba(255,255,255,0.45)] transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 to-indigo-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <BookOpen className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
              <span className="relative z-10">Explore Library</span>
            </motion.button>
          </Link>

          {/* ✨ STYLED 3D "JOIN FOR FREE" BUTTON ✨ */}
          {!isLoading && !isAuthenticated && (
            <Link href="/signup" className="w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.08, y: -5, rotateX: -5 }}
                whileTap={{ scale: 0.96 }}
                style={{ transformStyle: "preserve-3d" }}
                className="relative group h-16 w-full sm:w-auto px-10 rounded-2xl font-black text-base text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 border border-blue-400/50 shadow-[0_15px_40px_rgba(79,70,229,0.5)] hover:shadow-[0_25px_65px_rgba(99,102,241,0.75)] transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden"
              >
                {/* Dynamic 3D Shimmer Beam */}
                <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-25deg] group-hover:left-[200%] transition-all duration-1000 ease-out" />

                {/* Floating Glow Aura */}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500 opacity-0 group-hover:opacity-60 blur-lg transition-opacity duration-500 -z-10" />

                <div className="p-2 rounded-xl bg-white/20 border border-white/30 backdrop-blur-md">
                  <UserPlus className="h-5 w-5 text-white group-hover:rotate-12 transition-transform duration-300" />
                </div>

                <div className="flex flex-col items-start text-left">
                  <span className="text-base font-extrabold leading-none tracking-tight flex items-center gap-1.5">
                    Join for Free
                    <ArrowUpRight className="h-4 w-4 text-cyan-200 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </span>
                  <span className="text-[10px] font-semibold text-blue-200 uppercase tracking-widest mt-0.5">
                    Instant Access • No Card
                  </span>
                </div>
              </motion.button>
            </Link>
          )}
        </div>
      </motion.div>
    </section>
  );
}
