"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, Trophy, AlertCircle } from "lucide-react";
import { quizService } from "@/services/quizService";

export function QuizWidget() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    quizService.list("assigned").then(setQuizzes).catch(() => setQuizzes([])).finally(() => setLoading(false));
  }, []);
  if (loading) return <div className="rounded-2xl border p-6 bg-[var(--card)]">Loading quizzes...</div>;
  const pending = quizzes.filter(q => q.status === "published").slice(0, 3);
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-500" /> Quizzes</h3>
        <Link href="/quizzes" className="text-xs text-blue-600 hover:underline">View all →</Link>
      </div>
      {pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending quizzes. Great job!</p>
      ) : (
        <div className="space-y-3">
          {pending.map(q => (
            <Link key={q.id} href={`/quizzes/${q.id}`} className="flex items-center justify-between p-3 rounded-xl border hover:bg-slate-50 transition">
              <div>
                <p className="text-sm font-medium line-clamp-1">{q.title}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-2"><Clock className="h-3 w-3" />{q.duration_minutes} min • {q.total_marks} marks</p>
              </div>
              <span className="text-xs px-2 py-1 bg-blue-600 text-white rounded-full">Start</span>
            </Link>
          ))}
        </div>
      )}
      {quizzes.length > 3 && <p className="text-xs text-muted-foreground mt-3">+{quizzes.length - 3} more assigned</p>}
    </div>
  );
}
