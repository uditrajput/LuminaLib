"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, UserPlus, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Footer3DCTA() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-slate-800/80 px-8 py-24 text-center shadow-[0_30px_90px_-20px_rgba(15,23,42,0.9)] flex flex-col items-center gap-8 mb-20 group perspective-1200">
      {/* Subtle animated background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

      {/* Radiant Glowing Portal Backlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-600/30 via-indigo-500/25 to-violet-600/30 blur-[120px] rounded-full pointer-events-none" />

      {/* Floating 3D Sparkle Emblem */}
      <motion.div
        whileHover={{ rotateY: 20, scale: 1.1 }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative z-10 w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 p-[2px] shadow-2xl shadow-blue-500/40 cursor-pointer"
      >
        <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
          <Sparkles className="h-10 w-10 text-cyan-400 animate-pulse" />
        </div>
      </motion.div>

      <div className="relative z-10 max-w-2xl mx-auto space-y-4">
        <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-lg">
          Ascend Beyond Static Reading.
        </h2>
        <p className="text-slate-400 text-lg font-medium leading-relaxed">
          Join thousands of researchers, students, and enthusiasts using LuminaLib's 3D AI engine to extract maximum value from every page.
        </p>
      </div>

      {/* STYLED 3D "JOIN FOR FREE" ACTION BUTTON */}
      {!isLoading && !isAuthenticated && (
        <Link href="/signup" className="relative z-10 mt-2">
          <motion.button
            whileHover={{ scale: 1.08, y: -6, rotateX: -4 }}
            whileTap={{ scale: 0.96 }}
            style={{ transformStyle: "preserve-3d" }}
            className="relative group h-16 px-12 rounded-2xl font-black text-lg text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 border border-blue-400/50 shadow-[0_20px_50px_rgba(79,70,229,0.6)] hover:shadow-[0_30px_75px_rgba(99,102,241,0.85)] transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden"
          >
            {/* Shimmer Beam Effect */}
            <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-25deg] group-hover:left-[200%] transition-all duration-1000 ease-out" />

            <UserPlus className="h-6 w-6 text-white group-hover:rotate-12 transition-transform duration-300" />
            <span className="relative z-10">Join for Free</span>
            <ArrowRight className="h-5 w-5 text-cyan-200 group-hover:translate-x-1.5 transition-transform" />
          </motion.button>
        </Link>
      )}

      {/* Trust Guarantee Badges */}
      <div className="relative z-10 flex items-center justify-center gap-6 text-xs text-slate-400 font-semibold pt-4">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-400" /> Enterprise RBAC Security
        </span>
        <span className="h-1 w-1 rounded-full bg-slate-700" />
        <span className="flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-amber-400" /> Instant Setup
        </span>
      </div>
    </section>
  );
}
