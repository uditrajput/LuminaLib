"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { quizService } from "@/services/quizService";
import { groupService } from "@/services/groupService";
import { getBooks } from "@/services/bookService";
import { useAppDialog } from "@/components/ui/AppDialog";
import { useAuth } from "@/hooks/useAuth";
import {
  Sparkles,
  Clock,
  Percent,
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Eye,
  Save,
  BookOpen,
  CheckCheck,
  RefreshCw,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const POPULAR_TOPICS = [
  "Science",
  "Physics",
  "Chemistry",
  "Biology",
  "Mathematics",
  "Algebra & Trigonometry",
  "Computer Science",
  "Python Programming",
  "World History",
];

const PASS_PERCENTAGE_OPTIONS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export default function EditQuizPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { showAlert, showConfirmAsync } = useAppDialog();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [quiz, setQuiz] = useState<any>(null);

  // Time picker state (hours and minutes)
  const [durationHours, setDurationHours] = useState(0);
  const [durationMins, setDurationMins] = useState(30);

  const [form, setForm] = useState({
    title: "",
    description: "",
    instructions: "",
    duration_minutes: 30,
    pass_percentage: 70,
    max_attempts: 1,
    shuffle_questions: false,
    show_result: "immediately",
    show_correct_answers: "after_submit",
    status: "published",
    available_from: "",
    available_until: "",
  });

  const [questions, setQuestions] = useState<any[]>([]);
  const [groupIds, setGroupIds] = useState<number[]>([]);
  const [ai, setAi] = useState({
    source: "topic",
    topic: "",
    book_id: "",
    num_questions: 5,
    difficulty: "mixed",
  });

  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      groupService.list().then(setGroups).catch(() => {});
      getBooks(1, 100, "", "all")
        .then(res => setBooks(res.items || []))
        .catch(() => {
          getBooks(1, 100, "", "public")
            .then(res => setBooks(res.items || []))
            .catch(() => {});
        });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    quizService
      .get(Number(id))
      .then(q => {
        setQuiz(q);
        const rawFrom = q.available_from ? new Date(q.available_from).toISOString().slice(0, 16) : "";
        const rawUntil = q.available_until ? new Date(q.available_until).toISOString().slice(0, 16) : "";
        const dur = q.duration_minutes || 30;
        setDurationHours(Math.floor(dur / 60));
        setDurationMins(dur % 60);

        setForm({
          title: q.title || "",
          description: q.description || "",
          instructions: q.instructions || "",
          duration_minutes: dur,
          pass_percentage: q.pass_percentage || 70,
          max_attempts: q.max_attempts || 1,
          shuffle_questions: !!q.shuffle_questions,
          show_result: q.show_result || "immediately",
          show_correct_answers: q.show_correct_answers || "after_submit",
          status: q.status || "published",
          available_from: rawFrom,
          available_until: rawUntil,
        });

        if (Array.isArray(q.questions)) {
          const qs = q.questions.map((qq: any) => ({
            type: qq.type || "mcq_single",
            prompt: qq.prompt || "",
            marks: qq.marks || 1,
            options: Array.isArray(qq.options)
              ? qq.options.map((o: any) => ({
                  text: o.text || "",
                  is_correct: !!o.is_correct,
                }))
              : [
                  { text: "", is_correct: true },
                  { text: "", is_correct: false },
                  { text: "", is_correct: false },
                  { text: "", is_correct: false },
                ],
            explanation: qq.explanation || "",
            rubric: qq.rubric || "",
            expected_answer: qq.expected_answer || "",
            ai_generated: !!qq.ai_generated,
          }));
          setQuestions(qs);
        }

        if (Array.isArray(q.group_ids)) {
          setGroupIds(q.group_ids);
        }

        setAi(prev => ({
          ...prev,
          source: q.source_type || "topic",
          topic: q.title || "",
          book_id: q.source_book_id ? String(q.source_book_id) : "",
        }));
      })
      .catch((err) => {
        showAlert(err?.message || "Failed to load quiz", { title: "Error", variant: "error" });
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Update duration_minutes when hours or minutes change
  useEffect(() => {
    const totalMinutes = Math.max(1, durationHours * 60 + durationMins);
    setForm(prev => ({ ...prev, duration_minutes: totalMinutes }));
  }, [durationHours, durationMins]);

  // Helper to generate dynamic instructions
  const generateDynamicInstructions = (
    title: string,
    hours: number,
    mins: number,
    passPct: number
  ) => {
    const durationParts: string[] = [];
    if (hours > 0) durationParts.push(`${hours} hr${hours > 1 ? "s" : ""}`);
    if (mins > 0 || hours === 0) durationParts.push(`${mins} min${mins !== 1 ? "s" : ""}`);
    const durStr = durationParts.join(" ");

    return `Read all questions carefully before answering. Total duration: ${durStr}. Passing score requirement: ${passPct}%. All answers are auto-saved in real-time. The quiz will auto-submit when the timer expires. Ensure a stable network connection before beginning.`;
  };

  const handleSuggestDescription = (titleToUse?: string) => {
    const topic = (titleToUse || form.title).trim();
    if (!topic) return;
    const suggestedDesc = `Comprehensive assessment covering core conceptual principles, fundamental definitions, practical applications, and analytical problem-solving in ${topic}.`;
    setForm(prev => ({ ...prev, description: suggestedDesc }));
  };

  const addMcqSingle = () => {
    setQuestions(q => [
      ...q,
      {
        type: "mcq_single",
        prompt: "",
        marks: 1,
        options: [
          { text: "", is_correct: true },
          { text: "", is_correct: false },
          { text: "", is_correct: false },
          { text: "", is_correct: false },
        ],
        explanation: "",
      },
    ]);
  };

  const addMcqMulti = () => {
    setQuestions(q => [
      ...q,
      {
        type: "mcq_multi",
        prompt: "",
        marks: 1,
        options: [
          { text: "", is_correct: true },
          { text: "", is_correct: true },
          { text: "", is_correct: false },
          { text: "", is_correct: false },
        ],
        explanation: "",
      },
    ]);
  };

  const addDesc = () => {
    setQuestions(q => [
      ...q,
      {
        type: "descriptive",
        prompt: "",
        marks: 5,
        rubric: "Criteria: Conceptual accuracy (40%), Technical reasoning & steps (40%), Structure & clarity (20%).",
        expected_answer: "",
        grading_type: "manual",
      },
    ]);
  };

  const generateAI = async () => {
    const topicToUse = ai.topic.trim() || form.title.trim();
    if (ai.source !== "book" && !topicToUse) {
      showAlert("Please enter a topic or quiz title to generate questions", {
        title: "Missing Topic",
        variant: "warning",
      });
      return;
    }
    if (ai.source === "book" && !ai.book_id) {
      showAlert("Please select or enter a Book ID", {
        title: "Missing Book",
        variant: "warning",
      });
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        source: ai.source,
        num_questions: ai.num_questions,
        difficulty: ai.difficulty,
        marks_per_question: 1,
      };
      if (ai.source === "book") payload.book_id = Number(ai.book_id);
      if (ai.source === "topic") payload.topic = topicToUse;
      if (ai.source === "prompt") payload.prompt = ai.topic || topicToUse;

      const res = await quizService.generate(payload);
      const qs = (res.questions || []).map((qq: any) => {
        let opts = qq.options;
        if (qq.type === "mcq_single" && Array.isArray(opts)) {
          while (opts.length < 4) {
            opts.push({ text: `Additional plausible choice ${opts.length + 1}`, is_correct: false });
          }
        }
        return {
          type: qq.type,
          prompt: qq.prompt,
          marks: qq.marks || 1,
          options: opts || [],
          explanation: qq.explanation || "",
          rubric: qq.rubric || "",
          ai_generated: true,
        };
      });

      setQuestions(prev => [...prev, ...qs]);
      showAlert(`Generated and added ${qs.length} questions. Review and save changes!`, {
        title: "AI Generation Complete",
        variant: "success",
      });
    } catch (e: any) {
      showAlert(e?.message || "Question generation failed", {
        title: "Generation Failed",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const regenerateSingleQuestion = async (idx: number) => {
    const currentQ = questions[idx];
    const topicToUse = ai.topic.trim() || form.title.trim();
    if (ai.source !== "book" && !topicToUse) {
      showAlert("Please enter a topic or quiz title to regenerate this question", {
        title: "Missing Topic",
        variant: "warning",
      });
      return;
    }
    setRegeneratingIdx(idx);
    try {
      const payload: any = {
        source: ai.source,
        num_questions: 1,
        difficulty: ai.difficulty,
        marks_per_question: currentQ.marks || 1,
      };
      if (ai.source === "book" && ai.book_id) payload.book_id = Number(ai.book_id);
      if (ai.source === "topic") payload.topic = topicToUse;
      if (ai.source === "prompt") payload.prompt = ai.topic || topicToUse;

      if (currentQ.type === "mcq_single") {
        payload.mcq_single = 1;
        payload.mcq_multi = 0;
        payload.descriptive = 0;
      } else if (currentQ.type === "mcq_multi") {
        payload.mcq_single = 0;
        payload.mcq_multi = 1;
        payload.descriptive = 0;
      } else if (currentQ.type === "descriptive") {
        payload.mcq_single = 0;
        payload.mcq_multi = 0;
        payload.descriptive = 1;
      }

      const res = await quizService.generate(payload);
      const newQ = res.questions?.[0];
      if (newQ) {
        let opts = newQ.options;
        if (newQ.type === "mcq_single" && Array.isArray(opts)) {
          while (opts.length < 4) {
            opts.push({ text: `Additional plausible choice ${opts.length + 1}`, is_correct: false });
          }
        }
        const updated = {
          type: newQ.type || currentQ.type,
          prompt: newQ.prompt,
          marks: currentQ.marks || newQ.marks || 1,
          options: opts || [],
          explanation: newQ.explanation || "",
          rubric: newQ.rubric || "",
          expected_answer: newQ.expected_answer || "",
          ai_generated: true,
        };
        setQuestions(prev => {
          const next = [...prev];
          next[idx] = updated;
          return next;
        });
        showAlert(`Question ${idx + 1} regenerated successfully!`, {
          title: "Question Regenerated",
          variant: "success",
        });
      }
    } catch (e: any) {
      showAlert(e?.message || "Failed to regenerate question", {
        title: "Regeneration Failed",
        variant: "error",
      });
    } finally {
      setRegeneratingIdx(null);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      showAlert("Please provide a quiz title", { title: "Missing Title", variant: "warning" });
      setStep(1);
      return;
    }
    if (questions.length === 0) {
      showAlert("Please add or generate at least 1 question", { title: "No Questions", variant: "warning" });
      setStep(3);
      return;
    }

    // Schedule window validation
    if (form.available_from && form.available_until) {
      const fromTime = new Date(form.available_from).getTime();
      const untilTime = new Date(form.available_until).getTime();
      if (untilTime <= fromTime) {
        showAlert("End time must be strictly after start time. Dates/times cannot overlap or be inverted.", {
          title: "Invalid Schedule Window",
          variant: "error",
        });
        return;
      }
      const diffMins = (untilTime - fromTime) / (60 * 1000);
      if (diffMins < form.duration_minutes) {
        showAlert(
          `Schedule window (${Math.round(diffMins)} mins) cannot be smaller than the defined quiz duration (${form.duration_minutes} mins).`,
          { title: "Schedule Window Too Short", variant: "error" }
        );
        return;
      }
    }

    setSaving(true);
    try {
      const payload: any = {
        ...form,
        available_from: form.available_from ? new Date(form.available_from).toISOString() : null,
        available_until: form.available_until ? new Date(form.available_until).toISOString() : null,
        questions: questions.map((q, i) => ({
          ...q,
          order_index: i,
          options: q.options?.map((o: any) => ({
            text: o.text || "Option",
            is_correct: !!o.is_correct,
          })),
        })),
        group_ids: groupIds,
      };

      await quizService.update(Number(id), payload);
      showAlert("Quiz updated successfully!", { title: "Quiz Saved", variant: "success" });
      router.push(`/quizzes/${id}`);
    } catch (e: any) {
      showAlert(e?.response?.data?.detail || e?.message || "Update failed", {
        title: "Error",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!quiz) return;
    const ok = await showConfirmAsync(
      `Delete quiz "${quiz.title}"? This will archive the quiz if user attempts exist, otherwise permanently delete it.`,
      { title: "Delete Quiz", variant: "danger", confirmText: "Delete", cancelText: "Cancel" }
    );
    if (!ok) return;
    try {
      await quizService.delete(Number(id));
      showAlert("Quiz deleted", { title: "Deleted", variant: "success" });
      router.push("/admin/quizzes");
    } catch (e: any) {
      showAlert(e?.response?.data?.detail || e?.message || "Delete failed", { title: "Error", variant: "error" });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const totalMarks = questions.reduce((s, q) => s + (Number(q.marks) || 1), 0);
  const formattedDuration = durationHours > 0 ? `${durationHours}h ${durationMins}m` : `${durationMins} min`;

  return (
    <DashboardLayout>
      <div className="w-full space-y-6 animate-fade-in pb-12">
        {/* Top Breadcrumb & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link href="/admin/quizzes" className="hover:text-blue-600 flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Manage Quizzes
              </Link>
              <span>/</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">Edit Quiz #{id}</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <span className="p-2 bg-blue-600/10 text-blue-600 rounded-xl">
                <Pencil className="h-6 w-6" />
              </span>
              Edit Quiz: {form.title || quiz?.title}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 text-xs font-semibold transition-all cursor-pointer"
            >
              <Trash2 className="h-4 w-4" /> Delete Quiz
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving Changes..." : "Save All Changes"}
            </button>
          </div>
        </div>

        {/* Step Indicator Bar */}
        <div className="grid grid-cols-4 gap-2 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          {[
            { n: 1, label: "Details & Setup", desc: "Duration, Pass %, Group rules" },
            { n: 2, label: "Book / Ingestion Source", desc: "AI Source & context mapping" },
            { n: 3, label: "Question Studio", desc: `Manage & Regenerate (${questions.length} Qs)` },
            { n: 4, label: "Schedulers & Save", desc: "Schedule window & Status" },
          ].map(s => {
            const isCurrent = step === s.n;
            const isCompleted = step > s.n;
            return (
              <button
                key={s.n}
                type="button"
                onClick={() => setStep(s.n as any)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl text-left transition-all cursor-pointer",
                  isCurrent
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold border border-slate-200/80 dark:border-slate-700"
                    : isCompleted
                    ? "text-emerald-600 dark:text-emerald-400 hover:bg-white/50 dark:hover:bg-slate-800/40"
                    : "text-slate-500 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-slate-800/30"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-lg text-xs font-extrabold shrink-0",
                    isCurrent
                      ? "bg-blue-600 text-white shadow-xs"
                      : isCompleted
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  )}
                >
                  {isCompleted ? <CheckCheck className="h-4 w-4" /> : s.n}
                </div>
                <div className="hidden sm:block truncate">
                  <div className="text-xs leading-tight truncate">{s.label}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{s.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* STEP 1: Details & Setup */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="h-5 w-5 text-blue-600" />
                  Quiz Fundamentals & Setup
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Update quiz title, duration, pass criteria, and instructions.
                </p>
              </div>

              {/* Title & Suggested Topic Pills */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Quiz Title *
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSuggestDescription()}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" /> Auto-fill Description
                  </button>
                </div>
                <input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Fundamental Principles of Quantum Mechanics"
                  className="w-full p-3.5 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />

                {/* Popular topic chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-400 mr-1">Popular:</span>
                  {POPULAR_TOPICS.map(topic => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => {
                        setForm(prev => ({ ...prev, title: `${topic} Core Concepts & Mastery Assessment` }));
                        setAi(prev => ({ ...prev, topic }));
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 transition cursor-pointer"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief overview of what candidates will be tested on..."
                  rows={2}
                  className="w-full p-3.5 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Duration (Hours & Minutes Single-Line) */}
              <div className="space-y-3 p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-blue-600" />
                    Quiz Duration Limit *
                  </label>
                  <span className="text-xs font-bold px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-xl">
                    Total: {formattedDuration} ({form.duration_minutes} min)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-5 space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 block">Hours:</span>
                    <div className="flex gap-1.5">
                      {[0, 1, 2, 3].map(h => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setDurationHours(h)}
                          className={cn(
                            "flex-1 py-1.5 text-xs font-bold rounded-xl border text-center transition cursor-pointer",
                            durationHours === h
                              ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                          )}
                        >
                          {h} hr{h > 1 ? "s" : ""}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-7 space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 block">Minutes:</span>
                    <div className="flex gap-1">
                      {[0, 10, 15, 20, 30, 45, 50].map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setDurationMins(m)}
                          className={cn(
                            "flex-1 py-1.5 px-1 text-xs font-bold rounded-xl border text-center transition cursor-pointer whitespace-nowrap",
                            durationMins === m
                              ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                          )}
                        >
                          {m} min
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pass Percentage & Max Attempts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Percent className="h-4 w-4 text-emerald-600" />
                    Passing Requirement
                  </label>
                  <select
                    value={form.pass_percentage}
                    onChange={e => setForm({ ...form, pass_percentage: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {PASS_PERCENTAGE_OPTIONS.map(pct => (
                      <option key={pct} value={pct}>
                        {pct}% Score to Pass
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <HelpCircle className="h-4 w-4 text-purple-600" />
                    Max Attempts Allowed
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={form.max_attempts}
                    onChange={e => setForm({ ...form, max_attempts: Math.max(1, Number(e.target.value)) })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Candidate Instructions
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const dynamicInst = generateDynamicInstructions(
                        form.title,
                        durationHours,
                        durationMins,
                        form.pass_percentage
                      );
                      setForm(prev => ({ ...prev, instructions: dynamicInst }));
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                  >
                    Reset Instructions
                  </button>
                </div>
                <textarea
                  value={form.instructions}
                  onChange={e => setForm({ ...form, instructions: e.target.value })}
                  rows={3}
                  className="w-full p-3.5 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Assign to Groups */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                  Assign to User Groups & Classes ({groupIds.length} Selected)
                </label>
                {groups.length === 0 ? (
                  <p className="text-xs text-slate-400">No user groups available.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1">
                    {groups.map(g => {
                      const isAssigned = groupIds.includes(g.id);
                      return (
                        <label
                          key={g.id}
                          className={cn(
                            "flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer select-none transition",
                            isAssigned
                              ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100 font-bold"
                              : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={e => {
                              if (e.target.checked) setGroupIds(prev => [...prev, g.id]);
                              else setGroupIds(prev => prev.filter(gid => gid !== g.id));
                            }}
                            className="rounded border-slate-300"
                          />
                          <span className="truncate">{g.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold flex items-center gap-2 shadow-sm cursor-pointer"
              >
                Proceed to Ingestion Source <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Ingestion Source */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-600" />
                  AI Ingestion & Generation Source
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select how AI generates or regenerates questions for this quiz.
                </p>
              </div>

              {/* Source Mode Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: "topic", label: "Curriculum Topic", desc: "Generate based on topic prompt", icon: Layers },
                  { id: "book", label: "Library Book", desc: "Extract questions from uploaded book", icon: BookOpen },
                  { id: "prompt", label: "Custom Context", desc: "Provide verbatim syllabus text", icon: Sparkles },
                ].map(src => {
                  const isSelected = ai.source === src.id;
                  const Icon = src.icon;
                  return (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() => setAi({ ...ai, source: src.id })}
                      className={cn(
                        "p-4 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer",
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-100 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Icon className="h-5 w-5 text-blue-600" />
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                      </div>
                      <div>
                        <span className="font-bold text-sm block">{src.label}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{src.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Ingestion Parameters */}
              <div className="space-y-4 pt-2">
                {ai.source === "topic" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Topic or Subject Area
                    </label>
                    <input
                      value={ai.topic || form.title}
                      onChange={e => setAi({ ...ai, topic: e.target.value })}
                      placeholder="e.g. Data Structures, Cell Biology, Thermodynamics..."
                      className="w-full p-3.5 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                )}

                {ai.source === "book" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Select Library Book
                    </label>
                    <select
                      value={ai.book_id}
                      onChange={e => {
                        const selectedId = e.target.value;
                        const foundBook = books.find(b => String(b.id) === selectedId);
                        setAi(prev => ({
                          ...prev,
                          book_id: selectedId,
                          topic: foundBook ? foundBook.title : prev.topic,
                        }));
                      }}
                      className="w-full p-3.5 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">-- Select Book from Library ({books.length} Books Available) --</option>
                      {books.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.title} {b.author ? `— ${b.author}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {ai.source === "prompt" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Custom Syllabus Text / Excerpt
                    </label>
                    <textarea
                      value={ai.topic}
                      onChange={e => setAi({ ...ai, topic: e.target.value })}
                      placeholder="Paste chapter notes, lecture text, or specific learning outcomes..."
                      rows={4}
                      className="w-full p-3.5 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Questions Count to Generate
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={ai.num_questions}
                      onChange={e => setAi({ ...ai, num_questions: Number(e.target.value) })}
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Target Difficulty
                    </label>
                    <select
                      value={ai.difficulty}
                      onChange={e => setAi({ ...ai, difficulty: e.target.value })}
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold"
                    >
                      <option value="easy">Easy (Foundational)</option>
                      <option value="medium">Medium (Standard Assessment)</option>
                      <option value="hard">Hard (Advanced / Competitive)</option>
                      <option value="mixed">Mixed (Balanced Distribution)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Fundamentals
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold flex items-center gap-2 shadow-sm cursor-pointer"
              >
                Proceed to Question Studio <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Question Studio (with Regenerate Button) */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Top AI Generator Action Bar */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-xs mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-yellow-300" /> AI Question Generator
                </div>
                <h3 className="text-lg font-bold">Generate Additional Questions with AI</h3>
                <p className="text-xs text-blue-100 mt-0.5">
                  Generate high-quality multiple choice and descriptive questions instantly.
                </p>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={generateAI}
                className="px-5 py-2.5 rounded-2xl bg-white text-blue-600 hover:bg-blue-50 font-bold text-xs shadow-xs flex items-center gap-2 shrink-0 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                {loading ? "Generating..." : `+ Generate ${ai.num_questions} Questions`}
              </button>
            </div>

            {/* Manual Question Creator Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Add Questions Manually:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addMcqSingle}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-blue-600" /> MCQ (Single Choice)
                </button>
                <button
                  type="button"
                  onClick={addMcqMulti}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-indigo-600" /> MCQ (Multi Choice)
                </button>
                <button
                  type="button"
                  onClick={addDesc}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-purple-600" /> Descriptive
                </button>
              </div>
            </div>

            {/* Question Cards List */}
            {questions.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl space-y-3">
                <BookOpen className="h-10 w-10 text-slate-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Questions Added Yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click above to generate questions using AI or author them manually with our studio tools.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-5 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3 bg-white dark:bg-slate-800/80 shadow-2xs transition-all hover:border-slate-300 dark:hover:border-slate-600"
                  >
                    {/* Card Header with Regenerate and Delete Buttons */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg">
                          Question {idx + 1} • {q.type}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <span>Marks:</span>
                          <input
                            type="number"
                            min={1}
                            value={q.marks}
                            onChange={e => {
                              const v = [...questions];
                              v[idx].marks = Math.max(1, Number(e.target.value));
                              setQuestions(v);
                            }}
                            className="w-12 p-0.5 border border-slate-200 dark:border-slate-700 rounded text-center text-xs font-bold bg-white dark:bg-slate-800"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={regeneratingIdx === idx}
                          onClick={() => regenerateSingleQuestion(idx)}
                          className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 cursor-pointer font-medium px-2 py-0.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 transition-all disabled:opacity-50"
                          title="Regenerate this specific question with AI"
                        >
                          <RefreshCw className={cn("h-3 w-3", regeneratingIdx === idx && "animate-spin")} />
                          {regeneratingIdx === idx ? "Regenerating..." : "Regenerate"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setQuestions(prev => prev.filter((_, i) => i !== idx))}
                          className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1 cursor-pointer font-medium"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </div>

                    {/* Question Prompt */}
                    <textarea
                      value={q.prompt}
                      onChange={e => {
                        const v = [...questions];
                        v[idx].prompt = e.target.value;
                        setQuestions(v);
                      }}
                      placeholder={`Enter Question ${idx + 1} prompt...`}
                      rows={2}
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />

                    {/* MCQ Options with 4 choices */}
                    {q.type?.startsWith("mcq") && (
                      <div className="space-y-2 pt-1">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Options ({q.options?.length || 0}) — {q.type === "mcq_single" ? "Select the 1 correct answer" : "Select all correct answers"}:
                        </span>
                        <div className="space-y-2">
                          {(q.options || []).map((opt: any, oi: number) => {
                            const optionLetter = String.fromCharCode(65 + oi);
                            return (
                              <div
                                key={oi}
                                className={cn(
                                  "flex items-center gap-2.5 p-2 rounded-xl border transition-all",
                                  opt.is_correct
                                    ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                                    : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                                )}
                              >
                                <span className="text-xs font-bold text-slate-500 w-5 text-center">
                                  {optionLetter}.
                                </span>

                                <input
                                  value={opt.text}
                                  onChange={e => {
                                    const v = [...questions];
                                    v[idx].options[oi].text = e.target.value;
                                    setQuestions(v);
                                  }}
                                  placeholder={`Option ${optionLetter} text`}
                                  className="flex-1 p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                />

                                <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer select-none text-slate-700 dark:text-slate-300 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                                  <input
                                    type={q.type === "mcq_single" ? "radio" : "checkbox"}
                                    name={`edit-q-${idx}-correct`}
                                    checked={!!opt.is_correct}
                                    onChange={e => {
                                      const v = [...questions];
                                      if (q.type === "mcq_single") {
                                        v[idx].options.forEach((o: any, oidx: number) => {
                                          o.is_correct = oidx === oi;
                                        });
                                      } else {
                                        v[idx].options[oi].is_correct = e.target.checked;
                                      }
                                      setQuestions(v);
                                    }}
                                    className="rounded border-slate-300"
                                  />
                                  <span className={opt.is_correct ? "text-emerald-600 font-bold" : ""}>
                                    {opt.is_correct ? "✓ Correct" : "Mark Correct"}
                                  </span>
                                </label>

                                {q.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const v = [...questions];
                                      v[idx].options.splice(oi, 1);
                                      setQuestions(v);
                                    }}
                                    className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex justify-between items-center pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const v = [...questions];
                              v[idx].options.push({ text: "", is_correct: false });
                              setQuestions(v);
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Choice
                          </button>

                          <input
                            value={q.explanation || ""}
                            onChange={e => {
                              const v = [...questions];
                              v[idx].explanation = e.target.value;
                              setQuestions(v);
                            }}
                            placeholder="Explanation / Solution note (optional)"
                            className="w-1/2 p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    )}

                    {/* Descriptive Fields */}
                    {q.type === "descriptive" && (
                      <div className="space-y-2 pt-1">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Grading Rubric / Criteria:
                          </label>
                          <textarea
                            value={q.rubric || ""}
                            onChange={e => {
                              const v = [...questions];
                              v[idx].rubric = e.target.value;
                              setQuestions(v);
                            }}
                            placeholder="Evaluation criteria..."
                            rows={2}
                            className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Model / Reference Answer (Optional):
                          </label>
                          <textarea
                            value={q.expected_answer || ""}
                            onChange={e => {
                              const v = [...questions];
                              v[idx].expected_answer = e.target.value;
                              setQuestions(v);
                            }}
                            placeholder="Key points required in candidate answer..."
                            rows={2}
                            className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Ingestion Source
              </button>

              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold flex items-center gap-2 shadow-sm cursor-pointer"
              >
                Proceed to Schedulers & Save →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Schedulers & Save Changes */}
        {step === 4 && (
          <div className="space-y-6">
            {/* Dedicated Schedulers Panel */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/80 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Quiz Schedulers & Time Window</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Configure automated activation and closing window for assigned candidates.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                  Min Window: {formattedDuration} ({form.duration_minutes}m)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Scheduler 1: Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={form.available_from}
                    onChange={e => setForm({ ...form, available_from: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400">Leave blank for immediate availability.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500"></span> Scheduler 2: End Date & Time (Expiry)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.available_until}
                    min={form.available_from || undefined}
                    onChange={e => setForm({ ...form, available_until: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400">Must be strictly after Start Date/Time with no overlap.</p>
                </div>
              </div>

              {/* Status Selector */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Quiz Status:
                </label>
                <select
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                  className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none min-w-[240px]"
                >
                  <option value="published">🟢 Enabled (Active)</option>
                  <option value="scheduled">🔵 Scheduled (Active by Schedulers)</option>
                  <option value="disabled">🔴 Disabled (Hidden)</option>
                  <option value="draft">🟡 Draft (Admin only)</option>
                </select>
              </div>
            </div>

            {/* Summary & Save Changes */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCheck className="h-5 w-5 text-emerald-600" />
                    Review & Save Quiz Updates
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Save all question edits, time window adjustments, and group entitlement changes.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Questions</span>
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white">{questions.length}</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Marks</span>
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white">{totalMarks}</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Duration</span>
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white">{formattedDuration}</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Pass Criteria</span>
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white">{form.pass_percentage}%</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Question Studio
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold flex items-center gap-2 shadow-md cursor-pointer transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving Changes..." : "Save Quiz Updates"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
