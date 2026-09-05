"use client";
import { useState } from "react";
export function InstructionScreen({ quiz, onStart, loading }: { quiz: any; onStart: () => void; loading?: boolean }) {
  const [agreed, setAgreed] = useState(false);
  const total = quiz.questions?.length || quiz.total_questions || 0;
  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">📝 {quiz.title}</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Pass {quiz.pass_percentage}% • {quiz.duration_minutes} min • {quiz.total_marks} marks • {total} questions</p>
      <div className="mt-6 p-5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold mb-2 text-slate-900 dark:text-white">Instructions</h3>
        <div className="prose prose-sm dark:prose-invert whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 max-w-none">{quiz.instructions}</div>
        <ul className="mt-4 space-y-1 text-sm list-disc pl-5 text-slate-700 dark:text-slate-300">
          <li>Duration: <b className="text-slate-900 dark:text-white">{quiz.duration_minutes} minutes</b> — timer starts on Start</li>
          <li>Total Marks: <b className="text-slate-900 dark:text-white">{quiz.total_marks}</b> • Pass: <b className="text-slate-900 dark:text-white">{quiz.pass_percentage}%</b></li>
          <li>{total} questions • Shuffle: {quiz.shuffle_questions ? "Yes" : "No"}</li>
          <li>Negative marking: {quiz.negative_marking ? `Yes (${quiz.negative_marks})` : "No"}</li>
          <li>Attempts allowed: {quiz.max_attempts === 0 ? "Unlimited" : quiz.max_attempts}</li>
          <li>Progress auto-saves every 10s. Flag to revisit. Palette to jump.</li>
          <li>At 00:00 quiz auto-submits. Manual submit also available.</li>
        </ul>
      </div>
      <label className="flex items-center gap-2 mt-6 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" />
        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">I have read and agree to the instructions</span>
      </label>
      <button disabled={!agreed || loading} onClick={onStart} className="mt-6 w-full py-3 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors">
        {loading ? "Starting..." : "Start Quiz →"}
      </button>
    </div>
  );
}
