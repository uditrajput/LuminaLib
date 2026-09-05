"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { InstructionScreen } from "@/components/quiz/InstructionScreen";
import { quizService } from "@/services/quizService";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useAppDialog } from "@/components/ui/AppDialog";

export default function QuizDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { showAlert, showConfirmAsync } = useAppDialog();
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [attempts, setAttempts] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const qid = Number(id);
    Promise.all([quizService.get(qid), quizService.myAttempts(qid).catch(() => [])])
      .then(([q, a]) => { setQuiz(q); setAttempts(a); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, isAuthenticated]);

  const onStart = async () => {
    setStarting(true);
    try {
      const data = await quizService.startAttempt(Number(id));
      router.push(`/quizzes/${id}/attempt/${data.attempt_id}`);
    } catch (e: any) {
      showAlert(e?.response?.data?.detail || e.message || "Failed to start", { title: "Failed to start", variant: "error" });
      setStarting(false);
    }
  };

  if (loading) return <DashboardLayout><div className="text-center py-12 text-slate-600 dark:text-slate-400">Loading...</div></DashboardLayout>;
  if (!quiz) return <DashboardLayout><div className="text-center py-12 text-slate-600 dark:text-slate-400">Quiz not found or not entitled</div></DashboardLayout>;

  const hasPending = attempts.some(a => a.status === "in_progress");
  const pending = attempts.find(a => a.status === "in_progress");
  const canManage = !!quiz && (user?.role === "admin" || (quiz.created_by_user_id != null && (user as any)?.id === quiz.created_by_user_id));
  const handleDelete = async () => {
    if (!quiz) return;
    const ok = await showConfirmAsync(`Delete quiz "${quiz.title}"? This will archive if attempts exist.`, { title: "Delete Quiz", variant: "danger", confirmText: "Delete" });
    if (!ok) return;
    try { await quizService.delete(Number(id)); router.push("/admin/quizzes"); } catch (e: any) { showAlert(e?.response?.data?.detail || e?.message || "Delete failed", { title: "Error", variant: "error" }); }
  };

  return (
    <DashboardLayout>
      {canManage && quiz && (
        <div className="max-w-3xl mx-auto mb-4 flex gap-2 justify-end">
          <Link href={`/quizzes/${id}/edit`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Link>
          <button onClick={handleDelete} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 text-sm">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      )}
      {hasPending ? (
        <div className="max-w-3xl mx-auto text-center p-8 border rounded-2xl bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <p className="font-semibold text-amber-800 dark:text-amber-300">You have an in-progress attempt</p>
          <button onClick={() => router.push(`/quizzes/${id}/attempt/${pending.id}`)} className="mt-4 px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white">Resume Attempt →</button>
        </div>
      ) : (
        <InstructionScreen quiz={quiz} onStart={onStart} loading={starting} />
      )}
      {attempts.length > 0 && (
        <div className="max-w-3xl mx-auto mt-6 p-4 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900">
          <h4 className="font-semibold mb-2 text-slate-900 dark:text-white">My Attempts</h4>
          <div className="space-y-2">
            {attempts.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between text-sm p-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <span className="text-slate-700 dark:text-slate-300">Attempt #{a.id} • {a.status} • {a.score ?? "-"} / {a.percentage ? `${Math.round(a.percentage)}%` : "-"}</span>
                {a.status !== "in_progress" && <a href={`/quizzes/${id}/result/${a.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">View Result</a>}
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
