"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { quizService } from "@/services/quizService";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    quizService.result(Number(attemptId)).then(setData).finally(() => setLoading(false));
  }, [attemptId]);
  if (loading) return <DashboardLayout><div className="text-center py-12 text-slate-600 dark:text-slate-400">Loading result...</div></DashboardLayout>;
  if (!data || data.message) return <DashboardLayout><div className="text-center py-12 p-6 border border-amber-200 dark:border-amber-800 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300">{data?.message || "Not available yet"}</div></DashboardLayout>;
  return (
    <DashboardLayout>
      <div className="w-full space-y-6 animate-fade-in pb-12">
        {/* Navigation / Back Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition-all shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Quiz History in Profile →
            </Link>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-center shadow-xs">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{data.score} / {data.max_score} <span className="text-lg font-normal text-slate-500 dark:text-slate-400">({Math.round(data.percentage || 0)}%)</span></h1>
          <p className={`mt-2 font-semibold ${data.passed ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{data.passed ? "Passed ✅" : "Failed"} • {data.status} • Time {Math.floor((data.time_taken_seconds || 0)/60)}:{String((data.time_taken_seconds || 0)%60).padStart(2,"0")}</p>
        </div>
        <div className="mt-6 space-y-4">
          {(data.questions || []).map((q: any, idx: number) => (
            <div key={q.question_id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Q {idx+1} • {q.type} • {q.marks} marks</span>
                <span className={`text-xs px-2 py-1 rounded-full border ${q.is_correct ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" : q.score === 0 ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"}`}>{q.score ?? "-"} / {q.marks}</span>
              </div>
              <p className="mt-2 font-medium whitespace-pre-wrap text-slate-900 dark:text-white">{q.prompt}</p>
              {q.options && (
                <div className="mt-3 space-y-1">
                  {q.options.map((o: any) => (
                    <div key={o.id} className={`p-2 rounded text-sm border ${o.is_correct ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"}`}>{o.id.toUpperCase()}. {o.text} {o.is_correct ? "✓" : ""}</div>
                  ))}
                </div>
              )}
              {q.your_answer && (
                <div className="mt-3 text-sm p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                  <b>Your answer:</b> {q.your_answer.selected_option_ids ? q.your_answer.selected_option_ids.join(", ") : q.your_answer.descriptive_text || "—"}
                </div>
              )}
              {q.explanation && <div className="mt-2 text-xs p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-blue-800 dark:text-blue-300"><b>Explanation:</b> {q.explanation}</div>}
              {q.feedback && <div className="mt-2 text-xs p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-amber-800 dark:text-amber-300"><b>Feedback:</b> {q.feedback}</div>}
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
