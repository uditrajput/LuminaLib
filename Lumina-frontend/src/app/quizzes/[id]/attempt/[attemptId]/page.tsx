"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import { quizService } from "@/services/quizService";

export default function AttemptPage() {
  const { id, attemptId } = useParams<{ id: string; attemptId: string }>();
  const router = useRouter();
  const [quiz, setQuiz] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([quizService.get(Number(id)), quizService.getAttempt(Number(attemptId))])
      .then(([q, a]) => { setQuiz(q); setAttempt(a); })
      .finally(() => setLoading(false));
  }, [id, attemptId]);

  if (loading) return <DashboardLayout><div className="text-center py-12 text-slate-600 dark:text-slate-400">Loading runner...</div></DashboardLayout>;
  if (!quiz || !attempt) return <DashboardLayout><div className="text-center py-12 text-slate-600 dark:text-slate-400">Not found</div></DashboardLayout>;
  if (attempt.status !== "in_progress") {
    return <DashboardLayout><div className="text-center py-12 text-slate-700 dark:text-slate-300">Attempt already {attempt.status}. <button onClick={() => router.push(`/quizzes/${id}/result/${attemptId}`)} className="text-blue-600 dark:text-blue-400 underline">View result</button></div></DashboardLayout>;
  }
  return (
    <DashboardLayout>
      <QuizRunner quiz={quiz} attempt={attempt} onSubmit={() => router.push(`/quizzes/${id}/result/${attemptId}`)} />
    </DashboardLayout>
  );
}
