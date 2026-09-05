"use client";
import { useEffect, useState } from "react";
import apiClient from "@/services/apiClient";
import { Clock, Trophy, Calendar, Eye, Award, Timer } from "lucide-react";
import Link from "next/link";

type HistoryItem = {
  attempt_id: number;
  quiz_id: number;
  quiz_title: string;
  status: string;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  passed: boolean | null;
  time_taken_seconds: number | null;
  started_at: string;
  submitted_at: string | null;
  duration_minutes: number;
};

export function QuizHistorySection() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get("/users/me/quiz-history");
        const data = res.data as any;
        if (!cancelled) {
          setHistory(data.history || []);
          setTotal(data.total || 0);
        }
      } catch {
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fmtTime = (s: number | null) => {
    if (s == null) return "—";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };
  const fmtDate = (iso: string | null) => {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return iso; }
  };

  if (loading) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Loading quiz history…</div>;
  }
  if (history.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-8 text-center">
        <Award className="h-10 w-10 mx-auto text-slate-300 mb-3" />
        <h3 className="font-semibold text-slate-900 dark:text-white">No quiz history yet</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Your completed quizzes will appear here with obtained marks, time spent, and pass status. This view shows only your own data — no other users.</p>
        <Link href="/quizzes" className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">Browse Quizzes →</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-900 dark:text-white">Completed Quiz History</h3>
        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{total} attempt{total !== 1 ? "s" : ""} • your data only</span>
      </div>
      <div className="grid gap-3">
        {history.map((h) => (
          <div key={h.attempt_id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900 dark:text-white truncate">{h.quiz_title}</p>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                <Calendar className="h-3 w-3" /> {fmtDate(h.submitted_at || h.started_at)} • Attempt #{h.attempt_id}
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${h.passed ? "bg-emerald-50 text-emerald-700 border-emerald-200" : h.passed === false ? "bg-red-50 text-red-700 border-red-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>{h.status}</span>
              </p>
              <div className="flex flex-wrap gap-2 mt-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800"><Trophy className="h-3 w-3" /> {h.score ?? 0} / {h.max_score ?? h.duration_minutes} marks</span>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-700 rounded-full border">{h.percentage != null ? `${Math.round(h.percentage)}%` : "—"} {h.passed ? "Passed" : h.passed === false ? "Failed" : ""}</span>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-full border border-amber-200 dark:border-amber-800"><Timer className="h-3 w-3" /> {fmtTime(h.time_taken_seconds)} / {h.duration_minutes} min</span>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-700 rounded-full border"><Clock className="h-3 w-3" /> {fmtTime(h.time_taken_seconds)}</span>
              </div>
            </div>
            <Link href={`/quizzes/${h.quiz_id}/result/${h.attempt_id}`} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700">
              <Eye className="h-3.5 w-3.5" /> View Details
            </Link>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 text-center">Shown only for your account (user_id verified server-side). No mock or other users' data.</p>
    </div>
  );
}
