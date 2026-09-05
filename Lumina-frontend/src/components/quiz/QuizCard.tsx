"use client";
import { Clock, Trophy, Users, FileQuestion } from "lucide-react";
import Link from "next/link";
import { Quiz } from "@/types/quiz";

export function QuizCard({ quiz }: { quiz: Quiz }) {
  const isOpen = quiz.status === "published";
  return (
    <Link href={`/quizzes/${quiz.id}`} className="group block rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-700 transition-all">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold line-clamp-2 text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{quiz.title}</h3>
        <span className={`text-xs px-2 py-1 rounded-full font-medium border ${isOpen ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"}`}>{quiz.status}</span>
      </div>
      {quiz.description && <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mt-2">{quiz.description}</p>}
      <div className="flex flex-wrap gap-3 mt-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{quiz.duration_minutes} min</span>
        <span className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5" />{quiz.total_marks} marks</span>
        <span className="flex items-center gap-1"><FileQuestion className="h-3.5 w-3.5" />{quiz.total_questions} Qs</span>
        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{quiz.group_ids.length} groups</span>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-400">Pass {quiz.pass_percentage}% • {quiz.max_attempts === 0 ? "Unlimited" : `${quiz.max_attempts} attempt(s)`}</span>
        <span className="text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:underline">View →</span>
      </div>
    </Link>
  );
}
