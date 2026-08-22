"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Star, Sparkles, BookOpen } from "lucide-react";

interface Book3DCardProps {
  title: string;
  author: string;
  genre: string;
  rating: string;
  summary: string;
  coverUrl: string;
  badge?: string;
  accentColor?: string;
}

export default function Book3DCard({
  title,
  author,
  genre,
  rating,
  summary,
  coverUrl,
  badge = "Featured",
  accentColor = "from-blue-600 to-indigo-600",
}: Book3DCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRotateY((x / rect.width) * 25);
    setRotateX((-y / rect.height) * 20);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setIsHovered(false);
  };

  return (
    <div
      className="perspective-1200 py-6 px-4 flex flex-col items-center justify-center cursor-pointer select-none group"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={() => setIsOpen(!isOpen)}
    >
      {/* Outer 3D Perspective Container */}
      <motion.div
        animate={{
          rotateX: isOpen ? 5 : rotateX,
          rotateY: isOpen ? -30 : isHovered ? rotateY : -15,
          scale: isHovered || isOpen ? 1.05 : 1,
          y: isHovered ? -12 : 0,
        }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative w-64 h-96 transition-shadow duration-500"
      >
        {/* Book Shadow underneath */}
        <div
          className="absolute -bottom-8 left-4 right-4 h-8 bg-black/40 rounded-full blur-xl transition-all duration-500"
          style={{
            transform: `translateZ(-50px) scale(${isHovered ? 1.15 : 1})`,
            opacity: isHovered ? 0.6 : 0.35,
          }}
        />

        {/* 3D Book Spine Thickness (Left Side) */}
        <div
          className="absolute top-0 bottom-0 left-0 w-8 bg-slate-900 border-l border-slate-700/50 rounded-l-sm"
          style={{
            transform: "rotateY(-90deg) translateZ(4px)",
            transformOrigin: "left",
            backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.4) 100%)",
          }}
        >
          <div className="h-full flex items-center justify-center -rotate-90 text-[10px] font-bold uppercase tracking-widest text-slate-300 whitespace-nowrap opacity-80">
            {title}
          </div>
        </div>

        {/* 3D Book Pages Stack (Right Edge) */}
        <div
          className="absolute top-1 bottom-1 right-0 w-6 bg-[repeating-linear-gradient(0deg,#fff,#fff_2px,#e2e8f0_2px,#e2e8f0_4px)] rounded-r-xs shadow-inner"
          style={{
            transform: "rotateY(90deg) translateZ(248px)",
            transformOrigin: "right",
          }}
        />

        {/* Inside Book Pages (Revealed when Open) */}
        <div
          className="absolute inset-0 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-r-2xl p-6 shadow-2xl flex flex-col justify-between"
          style={{
            transform: "translateZ(-2px)",
            backfaceVisibility: "hidden",
          }}
        >
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 mb-2">
              <Sparkles className="h-4 w-4" />
              <span>AI Summary & Insights</span>
            </div>
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mb-1 line-clamp-2">{title}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 italic mb-3">by {author}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-6">{summary}</p>
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-500" /> {rating}
            </span>
            <span className="text-[10px] bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-semibold">
              Click to Close
            </span>
          </div>
        </div>

        {/* Book Front Cover (Flips Open on Click) */}
        <motion.div
          animate={{
            rotateY: isOpen ? -145 : 0,
          }}
          transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
          style={{
            transformStyle: "preserve-3d",
            transformOrigin: "left center",
          }}
          className="absolute inset-0 rounded-r-2xl rounded-l-xs overflow-hidden shadow-2xl border-r border-t border-b border-white/20"
        >
          {/* Front Cover Image */}
          <img
            src={coverUrl}
            alt={title}
            className="w-full h-full object-cover select-none"
          />

          {/* Dynamic Light Sheen Effect */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300"
            style={{
              background: `linear-gradient(${135 + rotateY * 2}deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 60%, rgba(0,0,0,0.3) 100%)`,
              opacity: isHovered ? 0.7 : 0.3,
            }}
          />

          {/* Badge & Overlay Details */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent p-5 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold text-white bg-gradient-to-r ${accentColor} shadow-lg backdrop-blur-md border border-white/20`}>
                <BookOpen className="h-3 w-3" />
                {badge}
              </span>
              <span className="text-[11px] font-bold text-amber-300 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-300" /> {rating}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-blue-300 tracking-wider block mb-1">{genre}</span>
              <h3 className="text-lg font-black text-white leading-tight drop-shadow-md">{title}</h3>
              <p className="text-xs text-slate-300 font-medium drop-shadow">{author}</p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Interactive Helper Prompt */}
      <motion.p
        animate={{ opacity: isHovered ? 1 : 0.6 }}
        className="mt-6 text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1.5"
      >
        <span>{isOpen ? "📖 Click to close cover" : "✨ Click cover to flip open & read AI insights"}</span>
      </motion.p>
    </div>
  );
}
