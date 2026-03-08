"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import Link from "next/link";
import {
  BookOpen, Search, Library, ArrowRight, Sparkles,
  Brain, Upload, Star, Zap, ShieldCheck, ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

const stats = [
  { label: "Books Indexed", value: "10K+", icon: BookOpen, gradient: "from-blue-500 to-cyan-400" },
  { label: "AI Summaries", value: "Instant", icon: Brain, gradient: "from-violet-500 to-purple-400" },
  { label: "Community Rating", value: "4.8 ★", icon: Star, gradient: "from-amber-500 to-orange-400" },
];

const features = [
  {
    icon: Library,
    title: "Vast Library Access",
    desc: "Browse a universally indexed collection of books spanning every genre and topic, powered by full metadata extraction.",
    theme: "blue",
  },
  {
    icon: Sparkles,
    title: "ML Recommendations",
    desc: "Our model actively analyzes your reading behavior to surface your next favorite book with astonishing accuracy.",
    theme: "violet",
  },
  {
    icon: Brain,
    title: "Semantic Q&A",
    desc: "Don't just read—converse. Ask deep, analytical questions about any document and receive contextually precise answers.",
    theme: "indigo",
  },
  {
    icon: Upload,
    title: "Automated Ingestion",
    desc: "Upload texts or PDFs. Lumina silently extracts, summarizes, chunks, and vectorizes content in the background.",
    theme: "emerald",
  },
  {
    icon: Star,
    title: "Rolling Consensus",
    desc: "Read AI-aggregated review summaries that digest thousands of community opinions into one clear verdict.",
    theme: "amber",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Secure",
    desc: "Built with a robust architecture using JWT stateless auth, SQLAlchemy repositories, and strict role validations.",
    theme: "slate",
  },
];

const themeStyles = {
  blue: "from-blue-100 to-cyan-50 text-blue-700 shadow-blue-200/50 ring-blue-500/20",
  violet: "from-violet-100 to-purple-50 text-violet-700 shadow-violet-200/50 ring-violet-500/20",
  indigo: "from-indigo-100 to-blue-50 text-indigo-700 shadow-indigo-200/50 ring-indigo-500/20",
  emerald: "from-emerald-100 to-teal-50 text-emerald-700 shadow-emerald-200/50 ring-emerald-500/20",
  amber: "from-amber-100 to-yellow-50 text-amber-700 shadow-amber-200/50 ring-amber-500/20",
  slate: "from-slate-100 to-gray-50 text-slate-700 shadow-slate-200/50 ring-slate-500/20",
};

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <DashboardLayout>
      {/* ── 3D Hero Section ── */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 px-6 py-20 md:py-32 mb-16 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] perspective-1000">

        {/* Dynamic Abstract 3D Background Objects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          {/* Main glowing orb */}
          <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-blue-600/30 via-indigo-500/20 to-violet-900/40 blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />
          {/* Subtle bottom glow */}
          <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-cyan-500/10 to-blue-600/20 blur-3xl" />

          {/* Floating glass shapes simulating 3D */}
          <div className="absolute top-[15%] right-[15%] w-32 h-32 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] animate-[bounce_6s_ease-in-out_infinite] rotate-12" />
          <div className="absolute bottom-[20%] left-[20%] w-24 h-24 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 backdrop-blur-md border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] animate-[pulse_4s_ease-in-out_infinite] animate-bounce delay-150" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center space-y-8 animate-fade-in">

          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-5 py-2 text-sm font-medium text-blue-200 backdrop-blur-md border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-shadow duration-300">
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span className="tracking-wide uppercase text-xs font-semibold">Next Generation AI Library</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-[1.1]">
            Experience Books in <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-400 drop-shadow-[0_0_30px_rgba(99,102,241,0.4)]">
              Three Dimensions
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-300 max-w-2xl font-light leading-relaxed">
            Read, analyze, and converse with documents using advanced <strong className="text-white font-semibold">Semantic AI</strong>. LuminaLib transforms reading from static text into dynamic intelligence.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-4 w-full sm:w-auto">
            <Link href="/books" className="w-full sm:w-auto">
              <Button size="lg" className="h-14 w-full sm:w-auto rounded-2xl px-10 bg-white text-slate-900 hover:bg-slate-50 gap-3 font-bold text-base shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] hover:-translate-y-1 transition-all duration-300">
                <Library className="h-5 w-5" />
                Explore Library
              </Button>
            </Link>
            {!isLoading && !isAuthenticated && (
              <Link href="/signup" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="h-14 w-full sm:w-auto rounded-2xl px-10 border-slate-700 bg-slate-800/50 text-white hover:bg-slate-700 backdrop-blur-md gap-3 font-semibold text-base shadow-[0_8px_16px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300 group">
                  Join for Free
                  <ArrowUpRight className="h-5 w-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── 3D Stats Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24 max-w-5xl mx-auto px-4">
        {stats.map(({ label, value, icon: Icon, gradient }, i) => (
          <div
            key={label}
            className="group relative"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className={`
              relative bg-white rounded-3xl p-8 flex flex-col items-center gap-4 text-center z-10
              border border-slate-100
              shadow-[0_8px_30px_rgb(0,0,0,0.04)]
              hover:shadow-[0_20px_40px_-5px_rgb(0,0,0,0.1),0_0_20px_rgba(99,102,241,0.1)]
              hover:-translate-y-2
              transition-all duration-500 ease-out
            `}>
              <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-500`}>
                <Icon className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-4xl font-black text-slate-900 tracking-tight">{value}</p>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mt-1">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Features 3D Grid ── */}
      <section className="mb-24 px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
            Built for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">Deep Discovery</span>
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg">
            A harmonious blend of aesthetic design and brute-force backend machine learning.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map(({ icon: Icon, title, desc, theme }, i) => (
            <div
              key={title}
              className="group relative perspective-1000"
            >
              {/* Feature card with 3D depth */}
              <div className="
                relative h-full bg-white rounded-[2rem] p-8 flex flex-col gap-5
                border border-slate-200/60
                shadow-[0_2px_10px_rgb(0,0,0,0.02),0_15px_35px_-5px_rgb(0,0,0,0.05),inset_0_-4px_0_0_rgb(226,232,240,0.5)]
                group-hover:shadow-[0_10px_30px_rgb(0,0,0,0.05),0_30px_60px_-10px_rgb(0,0,0,0.1),inset_0_-2px_0_0_rgb(226,232,240,0.2)]
                group-hover:-translate-y-2
                transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]
                z-10
              ">
                <div className={`
                  inline-flex p-4 rounded-2xl bg-gradient-to-br w-fit
                  ring-1 ring-inset
                  ${themeStyles[theme as keyof typeof themeStyles]}
                  group-hover:scale-110 group-hover:-rotate-3
                  transition-transform duration-500 ease-out
                `}>
                  <Icon className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
                  <p className="text-base text-slate-500 leading-relaxed font-medium">{desc}</p>
                </div>
              </div>

              {/* Decorative background shadow/glow that expands on hover */}
              <div className={`absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-br from-slate-200 to-slate-100 opacity-0 group-hover:opacity-100 blur-2xl group-hover:-translate-y-2 transition-all duration-500`} />
            </div>
          ))}
        </div>
      </section>

      {/* ── 3D Interactive CTA ── */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-200 px-8 py-20 text-center shadow-[0_20px_50px_-15px_rgb(0,0,0,0.05)] flex flex-col items-center gap-8 group mb-16">

        {/* Subtle animated background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-50" />

        <div className="relative z-10 w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 p-[2px] shadow-2xl shadow-blue-500/30 group-hover:-translate-y-2 transition-transform duration-500">
          <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center">
            <Search className="h-8 w-8 text-blue-600 animate-[pulse_3s_ease-in-out_infinite]" />
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
            Ascend Beyond Reading.
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto font-medium">
            Join thousands of scholars and enthusiasts leveraging LuminaLib to extract the highest value from every word.
          </p>
        </div>

        {!isLoading && !isAuthenticated && (
          <Link href="/signup" className="relative z-10 mt-2">
            <Button size="lg" className="h-14 rounded-2xl px-12 bg-slate-900 hover:bg-slate-800 text-white shadow-[0_10px_25px_rgba(15,23,42,0.3)] hover:shadow-[0_15px_35px_rgba(15,23,42,0.4)] hover:-translate-y-1 gap-3 font-bold text-lg transition-all duration-300 group/btn">
              Create Free Account
              <ArrowRight className="h-5 w-5 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </Link>
        )}
      </section>
    </DashboardLayout>
  );
}
