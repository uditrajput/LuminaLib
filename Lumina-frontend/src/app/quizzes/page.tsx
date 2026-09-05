"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { QuizCard } from "@/components/quiz/QuizCard";
import { quizService } from "@/services/quizService";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

export default function QuizzesPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const canManage = user?.role === "admin" || (user as any)?.role === "teacher";

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (isAuthenticated) {
      quizService.list("assigned")
        .then((data) => {
          const list = Array.isArray(data) ? data : [];
          setQuizzes(list);
          if (!canManage && list.length === 0) {
            router.replace("/dashboard");
          }
        })
        .catch(() => {
          setQuizzes([]);
          if (!canManage) {
            router.replace("/dashboard");
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isAuthenticated, isLoading, canManage, router]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Quizzes</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Assigned to your groups — complete before the window closes</p>
        </div>
        <div className="flex gap-2">
          {canManage && <Link href="/quizzes/create" className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">+ New Quiz</Link>}
          {canManage && <Link href="/admin/quizzes" className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700">Manage</Link>}
        </div>
      </div>
      {loading ? <div className="text-center py-12 text-slate-600 dark:text-slate-400">Loading...</div> : quizzes.length === 0 ? (
        <div className="text-center py-12 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900">
          <p className="text-slate-600 dark:text-slate-400">No quizzes assigned yet. Ask your teacher to assign one.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map(q => <QuizCard key={q.id} quiz={q} />)}
        </div>
      )}
    </DashboardLayout>
  );
}
