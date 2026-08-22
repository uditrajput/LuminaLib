"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Library, Sparkles, Brain, Upload, Star, ShieldCheck, ArrowRight
} from "lucide-react";

const features = [
  {
    icon: Library,
    title: "Vast Library Access",
    desc: "Browse a universally indexed collection of books spanning every genre and topic, powered by full metadata extraction.",
    gradient: "from-blue-500 to-cyan-500",
    badge: "Catalog",
  },
  {
    icon: Sparkles,
    title: "ML Recommendations",
    desc: "Our model actively analyzes your reading behavior to surface your next favorite book with astonishing accuracy.",
    gradient: "from-violet-500 to-purple-500",
    badge: "Personalized",
  },
  {
    icon: Brain,
    title: "Semantic Q&A",
    desc: "Don't just read—converse. Ask deep, analytical questions about any document and receive contextually precise answers.",
    gradient: "from-indigo-500 to-blue-600",
    badge: "Vector AI",
  },
  {
    icon: Upload,
    title: "Automated Ingestion",
    desc: "Upload texts or PDFs. Lumina silently extracts, summarizes, chunks, and vectorizes content in the background.",
    gradient: "from-emerald-500 to-teal-500",
    badge: "Processing",
  },
  {
    icon: Star,
    title: "Rolling Consensus",
    desc: "Read AI-aggregated review summaries that digest thousands of community opinions into one clear verdict.",
    gradient: "from-amber-500 to-orange-500",
    badge: "Reviews",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Secure",
    desc: "Built with a robust architecture using JWT stateless auth, SQLAlchemy repositories, and strict role validations.",
    gradient: "from-slate-700 to-slate-900",
    badge: "RBAC Shield",
  },
];

export default function Interactive3DFeatures() {
  return (
    <section className="mb-24 px-4 relative">
      <div className="text-center mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-3"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Core Intelligence Engine</span>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight"
        >
          Built for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600">Deep Discovery</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-base md:text-lg font-medium"
        >
          A harmonious blend of aesthetic design and brute-force backend machine learning.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map(({ icon: Icon, title, desc, gradient, badge }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            whileHover={{ y: -8, rotateX: -3, rotateY: 3, scale: 1.02 }}
            style={{ transformStyle: "preserve-3d" }}
            className="perspective-1000 group relative"
          >
            {/* Card Content */}
            <div className="
              relative h-full bg-white dark:bg-slate-900 rounded-[2rem] p-8 flex flex-col justify-between gap-6
              border border-slate-200/80 dark:border-slate-800
              shadow-[0_4px_20px_rgba(0,0,0,0.03)]
              group-hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.1),0_0_30px_rgba(99,102,241,0.15)]
              transition-all duration-500 ease-out z-10
            ">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg shadow-blue-500/10 group-hover:scale-110 transition-transform duration-500`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200/50 dark:border-slate-700/50">
                    {badge}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-normal">{desc}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center text-xs font-bold text-blue-600 dark:text-blue-400 gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                <span>Learn more</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
