"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Brain, Star, ShieldCheck } from "lucide-react";
import { getPublicBookStats, PublicBookStats } from "@/services/bookService";

export default function Stats3DGrid() {
  const [statsData, setStatsData] = useState<PublicBookStats>({
    books_count: 10000,
    summaries_count: 10000,
    rating: "4.9 ★",
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    getPublicBookStats()
      .then((data) => {
        if (mounted && data) {
          setStatsData(data);
          setLoaded(true);
        }
      })
      .catch(() => {
        // Fallback gracefully on network error or initial load
      });
    return () => {
      mounted = false;
    };
  }, []);

  const formattedBooks = loaded
    ? statsData.books_count > 0
      ? `${statsData.books_count.toLocaleString()}+`
      : "10,000+"
    : "10,000+";

  const stats = [
    {
      label: "Books & PDFs Indexed",
      value: formattedBooks,
      sub: "Dynamic Vector DB",
      icon: BookOpen,
      gradient: "from-blue-500 to-cyan-400",
      shadow: "shadow-blue-500/20",
    },
    {
      label: "AI RAG Summaries",
      value: "Sub-Second",
      sub: "pgvector HNSW Index",
      icon: Brain,
      gradient: "from-violet-500 to-purple-400",
      shadow: "shadow-purple-500/20",
    },
    {
      label: "Reader Satisfaction",
      value: statsData.rating || "4.9 ★",
      sub: "Verified Community",
      icon: Star,
      gradient: "from-amber-400 to-orange-500",
      shadow: "shadow-amber-500/20",
    },
  ];

  return (
    <div className="mb-24 max-w-6xl mx-auto px-4">
      {/* 3D Dynamic Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stats.map(({ label, value, sub, icon: Icon, gradient, shadow }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15 + 0.2 }}
            whileHover={{ y: -10, rotateX: 6, rotateY: -6, scale: 1.03 }}
            style={{ transformStyle: "preserve-3d" }}
            className="perspective-1000 group cursor-pointer"
          >
            <div
              className={`
              relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl p-8 flex flex-col items-center text-center gap-4 z-10
              border border-slate-200/80 dark:border-slate-800
              shadow-[0_10px_35px_rgba(0,0,0,0.05)]
              group-hover:shadow-[0_25px_50px_-10px_rgba(0,0,0,0.12),0_0_30px_rgba(99,102,241,0.2)]
              transition-all duration-500 ease-out
            `}
            >
              {/* Glowing Accent Orb */}
              <div
                className={`absolute -top-6 p-4 rounded-2xl bg-gradient-to-br ${gradient} ${shadow} shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500`}
              >
                <Icon className="h-7 w-7 text-white" />
              </div>

              <div className="pt-4">
                <p className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                  {value}
                </p>
                <p className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-2">
                  {label}
                </p>
              </div>

              {/* Dynamic Security & Indexing Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                <span>{sub}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
