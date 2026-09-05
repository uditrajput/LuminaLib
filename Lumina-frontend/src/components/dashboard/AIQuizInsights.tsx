"use client";
import { useEffect, useState } from "react";
import apiClient from "@/services/apiClient";
import { Sparkles, Clock, Trophy, Target, Lightbulb, ShieldCheck } from "lucide-react";
import Link from "next/link";

type Insights = {
  user_id: number;
  has_data: boolean;
  message?: string;
  stats: {
    total_attempts: number;
    graded: number;
    avg_percentage: number;
    avg_time_seconds: number;
    pass_rate: number;
    recent: { quiz_id: number; percentage: number | null; time: number | null; passed: boolean | null }[];
  } | null;
  suggestions: string[];
  grounded: boolean;
};

export function AIQuizInsights() {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get("/users/me/quiz-insights");
        if (!cancelled) setData(res.data as Insights);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <p className="text-sm text-muted-foreground">Loading personalized AI insights…</p>
      </div>
    );
  }

  // No data — honest, no false/generic numbers
  if (!data || !data.has_data) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h3 className="font-bold flex items-center gap-2"><Sparkles className="h-5 w-5 text-indigo-500" /> AI Improvement Suggestions</h3>
        <p className="text-sm text-muted-foreground mt-2">{data?.message || "No quiz history yet — attempt a quiz to get personalized AI suggestions. This dashboard shows only your data, no generic estimates."}</p>
        <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Your data only • verified server-side by user_id</p>
        <Link href="/quizzes" className="inline-block mt-3 text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700">Go to Quizzes →</Link>
      </div>
    );
  }

  const s = data.stats!;
  const fmtTime = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2"><Sparkles className="h-5 w-5 text-indigo-500" /> AI Improvement Suggestions</h3>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Your data only</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">Grounded strictly in your {s.total_attempts} attempt{s.total_attempts !== 1 ? "s" : ""} — no other users, no mock data.</p>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-center">
          <Trophy className="h-4 w-4 mx-auto text-indigo-600" />
          <p className="text-lg font-bold">{s.avg_percentage}%</p>
          <p className="text-xs text-muted-foreground">Avg Score</p>
        </div>
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-center">
          <Target className="h-4 w-4 mx-auto text-emerald-600" />
          <p className="text-lg font-bold">{s.pass_rate}%</p>
          <p className="text-xs text-muted-foreground">Pass Rate</p>
        </div>
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-center">
          <Clock className="h-4 w-4 mx-auto text-amber-600" />
          <p className="text-lg font-bold">{fmtTime(s.avg_time_seconds)}</p>
          <p className="text-xs text-muted-foreground">Avg Time</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {data.suggestions.map((tip, i) => (
          <div key={i} className="flex gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
            <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm leading-relaxed">{tip}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-[11px] text-slate-400">Based on your recent: {s.recent.map(r => `${Math.round(r.percentage ?? 0)}%`).join(" • ")}</p>
        <Link href="/profile" className="text-xs text-indigo-600 hover:underline">View full history →</Link>
      </div>
    </div>
  );
}
