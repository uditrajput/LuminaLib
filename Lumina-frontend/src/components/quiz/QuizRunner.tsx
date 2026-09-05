"use client";
import { useState, useEffect, useCallback } from "react";
import { QuestionPalette } from "./QuestionPalette";
import { Timer } from "./Timer";
import { useQuizTimer } from "@/hooks/useQuizTimer";
import { quizService } from "@/services/quizService";
import { useAppDialog } from "@/components/ui/AppDialog";

export function QuizRunner({ quiz, attempt, onSubmit }: { quiz: any; attempt: any; onSubmit: () => void }) {
  const { showConfirmAsync } = useAppDialog();
  const questions: any[] = quiz.questions || [];
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, { selected?: string[]; text?: string }>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const remaining = useQuizTimer(attempt.id, attempt.expires_at, () => handleAutoSubmit());

  // load existing answers
  useEffect(() => {
    const map: Record<number, any> = {};
    const flagMap: Record<number, boolean> = {};
    (attempt.answers || []).forEach((a: any) => {
      const idx = questions.findIndex((q: any) => q.id === a.question_id);
      if (idx >= 0) {
        map[idx] = { selected: a.selected_option_ids || [], text: a.descriptive_text || "" };
        flagMap[idx] = !!a.flagged;
      }
    });
    setAnswers(map);
    setFlagged(flagMap);
  }, [attempt, questions]);

  const q = questions[current];
  const isLast = current === questions.length - 1;

  const autosave = useCallback(async () => {
    if (isSubmitting) return;
    const payload = Object.entries(answers).map(([idx, v]: any) => ({
      question_id: questions[Number(idx)].id,
      selected_option_ids: v.selected || null,
      descriptive_text: v.text || null,
      flagged: !!flagged[Number(idx)],
    }));
    if (payload.length === 0) return;
    setSaving(true);
    try { await quizService.saveAnswers(attempt.id, payload); } catch {}
    setSaving(false);
  }, [answers, flagged, attempt.id, questions, isSubmitting]);

  useEffect(() => {
    const id = setInterval(autosave, 10000);
    const onBefore = () => { if (typeof navigator.sendBeacon === "function") autosave(); };
    window.addEventListener("beforeunload", onBefore);
    return () => { clearInterval(id); window.removeEventListener("beforeunload", onBefore); };
  }, [autosave]);

  const handleAutoSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await quizService.submit(attempt.id);
      onSubmit();
    } catch {
      onSubmit();
    }
  };

  const handleManualSubmit = async () => {
    if (isSubmitting) return;
    const unanswered = questions.length - Object.keys(answers).length;
    const flaggedCount = Object.values(flagged).filter(Boolean).length;
    const ok = await showConfirmAsync(`Submit quiz? ${unanswered} unanswered, ${flaggedCount} flagged.`, { title: "Submit Quiz", variant: "info", confirmText: "Submit", cancelText: "Cancel" });
    if (!ok) return;
    setIsSubmitting(true);
    try {
      await autosave();
      await quizService.submit(attempt.id);
      onSubmit();
    } catch {
      onSubmit();
    }
  };

  if (!q) return <div className="text-slate-900 dark:text-white p-8 text-center">No questions</div>;

  return (
    <div className="grid lg:grid-cols-[280px_1fr_220px] gap-6">
      {/* Palette */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 h-fit shadow-sm">
        <h4 className="font-semibold mb-3 text-slate-900 dark:text-white">Questions</h4>
        <QuestionPalette total={questions.length} current={current} answers={answers} flagged={flagged} onJump={setCurrent} />
        <div className="mt-4 flex gap-2 text-xs text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1"><span className="h-3 w-3 bg-emerald-500 rounded" /> Answered</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 bg-amber-400 rounded" /> Flagged</span>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-muted-foreground">Q {current + 1} of {questions.length} • {q.marks} marks • {q.type}</span>
          <Timer remaining={remaining} />
        </div>
        <h3 className="text-lg font-semibold leading-relaxed whitespace-pre-wrap text-slate-900 dark:text-white">{q.prompt}</h3>
        {q.type.startsWith("mcq") ? (
          <div className="mt-6 space-y-3">
            {q.type === "mcq_multi" && <p className="text-xs text-slate-500 dark:text-slate-400">Select all that apply</p>}
            {(q.options || []).map((opt: any) => {
              const sel = answers[current]?.selected || [];
              const checked = sel.includes(opt.id);
              return (
                <label key={opt.id} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${checked ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
                  <input
                    type={q.type === "mcq_single" ? "radio" : "checkbox"}
                    name={`q-${current}`}
                    checked={checked}
                    onChange={() => {
                      setAnswers(prev => {
                        const prevSel = prev[current]?.selected || [];
                        let next: string[];
                        if (q.type === "mcq_single") next = [opt.id];
                        else next = checked ? prevSel.filter(id => id !== opt.id) : [...prevSel, opt.id];
                        return { ...prev, [current]: { ...prev[current], selected: next } };
                      });
                    }}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{opt.id.toUpperCase()}.</span>
                  <span className="text-sm text-slate-800 dark:text-slate-200">{opt.text}</span>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="mt-6">
            <textarea
              value={answers[current]?.text || ""}
              onChange={e => setAnswers(prev => ({ ...prev, [current]: { ...prev[current], text: e.target.value } }))}
              placeholder="Type your answer..."
              rows={8}
              maxLength={5000}
              className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">{(answers[current]?.text || "").length} / 5000 • {q.word_limit ? `Soft limit ${q.word_limit} words` : ""}</div>
            {q.rubric && <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300"><b>Rubric:</b> {q.rubric}</div>}
          </div>
        )}
        <div className="flex items-center justify-between mt-8 gap-3 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            <button disabled={current === 0} onClick={() => setCurrent(c => c - 1)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50">← Previous</button>
            <button onClick={() => setFlagged(f => ({ ...f, [current]: !f[current] }))} className={`px-4 py-2 rounded-xl border ${flagged[current] ? "bg-amber-400 text-white border-amber-500" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"}`}>{flagged[current] ? "Unflag" : "Flag ⭐"}</button>
            <button onClick={() => setAnswers(prev => { const c = { ...prev }; delete c[current]; return c; })} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">Clear</button>
            {!isLast && <button onClick={() => setCurrent(c => Math.min(c+1, questions.length-1))} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-900/20">Skip →</button>}
          </div>
          <div className="flex gap-2">
            {!isLast ? (
              <button
                disabled={isSubmitting}
                onClick={() => { autosave(); setCurrent(c => c + 1); }}
                className="px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-medium shadow-sm cursor-pointer disabled:opacity-50"
              >
                Next →
              </button>
            ) : (
              <button
                disabled={isSubmitting}
                onClick={handleManualSubmit}
                className="px-6 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-medium shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Quiz"
                )}
              </button>
            )}
          </div>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-3">{saving ? "Saving..." : "Auto-saved every 10s ✓"}</div>
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 h-fit space-y-3 shadow-sm">
        <div className="text-sm text-slate-800 dark:text-slate-200 font-medium">Progress: {Object.keys(answers).length}/{questions.length} answered</div>
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-blue-600 transition-all" style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }} /></div>
        <button
          disabled={isSubmitting}
          onClick={handleManualSubmit}
          className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white hover:bg-black dark:hover:bg-slate-700 border border-slate-900 dark:border-slate-700 cursor-pointer font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Quiz"
          )}
        </button>
        <button
          disabled={isSubmitting || saving}
          onClick={autosave}
          className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer font-medium disabled:opacity-50 transition-all shadow-2xs"
        >
          {saving ? "Saving..." : "Save Now"}
        </button>
      </div>
    </div>
  );
}
