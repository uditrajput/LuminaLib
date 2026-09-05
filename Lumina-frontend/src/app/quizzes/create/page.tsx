"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { quizService } from "@/services/quizService";
import { useRouter } from "next/navigation";
import { getBooks } from "@/services/bookService";
import { groupService } from "@/services/groupService";
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
  Send,
  BookOpen,
  CheckCheck,
  RefreshCw,
} from "lucide-react";
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

export default function CreateQuizPage() {
  const router = useRouter();
  const { showAlert, showConfirmAsync } = useAppDialog();
  const { isAuthenticated, isLoading } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);

  // Time picker state (hours and minutes)
  const [durationHours, setDurationHours] = useState(0);
  const [durationMins, setDurationMins] = useState(30);

  const [form, setForm] = useState({
    title: "",
    description: "",
    instructions: "",
    duration_minutes: 30,
    pass_percentage: 70, // 70% by default as requested
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

  // Update duration_minutes when hours or minutes change
  useEffect(() => {
    const totalMinutes = Math.max(1, durationHours * 60 + durationMins);
    setForm(prev => ({ ...prev, duration_minutes: totalMinutes }));
  }, [durationHours, durationMins]);

  // Helper to generate dynamic instructions based on current settings
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

    const topicRef = title.trim() ? `on "${title.trim()}"` : "";
    return `Read all questions carefully before answering. Total duration: ${durStr}. Passing score requirement: ${passPct}%. All answers are auto-saved in real-time. The quiz will auto-submit when the timer expires. Ensure a stable network connection before beginning.`;
  };

  // Auto-fill dynamic instructions if empty or upon title/duration change
  useEffect(() => {
    if (!form.instructions || form.instructions.includes("Read all questions carefully")) {
      const dynamicInst = generateDynamicInstructions(
        form.title,
        durationHours,
        durationMins,
        form.pass_percentage
      );
      setForm(prev => ({ ...prev, instructions: dynamicInst }));
    }
  }, [form.title, durationHours, durationMins, form.pass_percentage]);

  // Suggest description based on title
  const handleSuggestDescription = (titleToUse?: string) => {
    const topic = (titleToUse || form.title).trim();
    if (!topic) return;
    const suggestedDesc = `Comprehensive assessment covering core conceptual principles, fundamental definitions, practical applications, and analytical problem-solving in ${topic}.`;
    setForm(prev => ({ ...prev, description: suggestedDesc }));
  };

  // Add MCQ Single with 4 options and 1 marked correct
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

  // Add MCQ Multi with 4 options
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
      if (ai.source === "prompt") payload.prompt = ai.topic;

      const res = await quizService.generate(payload);
      const qs = (res.questions || []).map((qq: any) => {
        // Normalize options to ensure min 4 options for MCQ
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
      showAlert(`Generated ${qs.length} unique questions with 4 choices. Review and edit before submitting!`, {
        title: "AI Generation Complete",
        variant: "success",
      });
    } catch (e: any) {
      showAlert(e?.message || "Question generation failed", {
        title: "Generation Failed",
        variant: "error",
      });
    }
    setLoading(false);
  };

  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);

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

  const submit = async (publish: boolean) => {
    if (!form.title.trim()) {
      showAlert("Please provide a quiz title", { title: "Missing Title", variant: "warning" });
      setStep(1);
      return;
    }
    if (questions.length === 0) {
      showAlert("Please add or generate at least 1 question", { title: "No Questions", variant: "warning" });
      setStep(2);
      return;
    }

    if (publish) {
      const ok = await showConfirmAsync(
        `Are you sure you want to publish "${form.title}" with ${questions.length} questions to ${groupIds.length} assigned group(s)?`,
        {
          title: "Publish Quiz",
          variant: "info",
          confirmText: "Publish & Assign",
          cancelText: "Cancel",
        }
      );
      if (!ok) return;
    }

    // Schedular validation
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

    setLoading(true);
    try {
      const payload = {
        ...form,
        available_from: form.available_from ? new Date(form.available_from).toISOString() : null,
        available_until: form.available_until ? new Date(form.available_until).toISOString() : null,
        source_type: "manual",
        questions: questions.map((q, i) => ({
          ...q,
          order_index: i,
          options: q.options?.map((o: any) => ({
            text: o.text || "Option",
            is_correct: !!o.is_correct,
          })),
        })),
        group_ids: groupIds,
        status: publish ? form.status || "published" : "draft",
      };
      const quiz = await quizService.create(payload);
      if (publish && groupIds.length > 0) {
        await quizService.assign(quiz.id, groupIds);
      }
      showAlert(`Quiz successfully ${publish ? "published and assigned" : "saved as draft"}!`, {
        title: "Success",
        variant: "success",
      });
      router.push(`/quizzes/${quiz.id}`);
    } catch (e: any) {
      showAlert(e?.response?.data?.detail || e?.message || "Creation failed", {
        title: "Error",
        variant: "error",
      });
    }
    setLoading(false);
  };

  const totalMarks = questions.reduce((s, q) => s + (Number(q.marks) || 1), 0);
  const formattedDuration = durationHours > 0 ? `${durationHours}h ${durationMins}m` : `${durationMins} min`;

  return (
    <DashboardLayout>
      <div className="w-full space-y-6 animate-fade-in pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <span className="p-2 bg-blue-600/10 text-blue-600 rounded-xl">
                <BookOpen className="h-6 w-6" />
              </span>
              Create Quiz
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Build engaging quizzes with AI-assisted authoring, custom timeframes, and instant group assignments.
            </p>
          </div>

          {/* Quick Summary Pill */}
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0 self-start sm:self-auto">
            <span className="whitespace-nowrap">⏱ {formattedDuration}</span>
            <span className="text-slate-400">•</span>
            <span className="text-blue-600 dark:text-blue-400 whitespace-nowrap">Pass: {form.pass_percentage}%</span>
            <span className="text-slate-400">•</span>
            <span className="whitespace-nowrap">{questions.length} Qs ({totalMarks} marks)</span>
          </div>
        </div>

        {/* Step Navigation Bar */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          {[
            { num: 1, label: "Details & Setup" },
            { num: 2, label: "Questions & AI" },
            { num: 3, label: "Groups & Settings" },
            { num: 4, label: "Schedulers & Submit" },
          ].map(s => {
            const isCurrent = step === s.num;
            const isCompleted = step > s.num;
            return (
              <button
                key={s.num}
                onClick={() => setStep(s.num as any)}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-xl border text-left transition-all cursor-pointer",
                  isCurrent
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-xs ring-1 ring-blue-500"
                    : isCompleted
                    ? "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60 hover:opacity-100"
                )}
              >
                <div
                  className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    isCurrent
                      ? "bg-blue-600 text-white"
                      : isCompleted
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  )}
                >
                  {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : s.num}
                </div>
                <div className="min-w-0 hidden md:block">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Step {s.num}</p>
                  <p className="text-xs font-bold truncate text-slate-900 dark:text-white">{s.label}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Step 1: Details & Setup */}
        {step === 1 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-600" />
                Quiz Details & Criteria
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter your quiz title to auto-suggest contextual descriptions and dynamic instructions.
              </p>
            </div>

            {/* Quick Topic Chips */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Popular Subjects & Topics:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_TOPICS.map(topic => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => {
                      setForm(prev => ({ ...prev, title: topic }));
                      setAi(prev => ({ ...prev, topic }));
                      handleSuggestDescription(topic);
                    }}
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 transition cursor-pointer"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Quiz Title *</span>
                {form.title && (
                  <button
                    type="button"
                    onClick={() => handleSuggestDescription()}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Auto-suggest description
                  </button>
                )}
              </label>
              <input
                value={form.title}
                onChange={e => {
                  const val = e.target.value;
                  setForm(prev => ({ ...prev, title: val }));
                  setAi(prev => ({ ...prev, topic: val }));
                }}
                placeholder="e.g. Science — Physics Fundamentals & Laws of Motion"
                className="w-full p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-2xs font-medium"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Description</span>
                <span className="text-xs text-slate-400">Brief topic summary</span>
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Assessment covering core laws of physics, definitions, and problem-solving..."
                rows={2}
                className="w-full p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-2xs text-sm"
              />
            </div>

            {/* Instructions (Dynamic) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>Student Instructions</span>
                  <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    Dynamic
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const inst = generateDynamicInstructions(
                      form.title,
                      durationHours,
                      durationMins,
                      form.pass_percentage
                    );
                    setForm(prev => ({ ...prev, instructions: inst }));
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <RefreshCw className="h-3 w-3" />
                  Sync with Duration & Pass %
                </button>
              </div>
              <textarea
                value={form.instructions}
                onChange={e => setForm({ ...form, instructions: e.target.value })}
                rows={3}
                className="w-full p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition shadow-2xs text-sm leading-relaxed"
              />
            </div>

            {/* Duration Time Picker (Hours and Mins) */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
              <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>Quiz Duration (Hours & Minutes)</span>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100/70 dark:bg-blue-900/40 px-2 py-0.5 rounded-md ml-auto">
                  Total: {formattedDuration}
                </span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Hours Picker */}
                <div className="md:col-span-5 space-y-1.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Hours:</span>
                  <div className="flex gap-1.5">
                    {[0, 1, 2, 3, 4].map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setDurationHours(h)}
                        className={cn(
                          "flex-1 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer text-center whitespace-nowrap",
                          durationHours === h
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                        )}
                      >
                        {h} {h === 1 ? "hr" : "hrs"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Minutes Picker */}
                <div className="md:col-span-7 space-y-1.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Minutes:</span>
                  <div className="flex gap-1.5">
                    {[0, 10, 15, 20, 30, 45, 50].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDurationMins(m)}
                        className={cn(
                          "flex-1 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer text-center whitespace-nowrap",
                          durationMins === m
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                        )}
                      >
                        {m} min
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Pass % (10 to 100 with default 70%) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Percent className="h-4 w-4 text-emerald-600" />
                  <span>Passing Percentage</span>
                </label>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full">
                  {form.pass_percentage}% Required to Pass
                </span>
              </div>

              {/* Segmented Pill Selector */}
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                {PASS_PERCENTAGE_OPTIONS.map(pct => {
                  const isSelected = form.pass_percentage === pct;
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, pass_percentage: pct }))}
                      className={cn(
                        "py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center",
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm scale-105 ring-2 ring-blue-400/40"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300"
                      )}
                    >
                      {pct}%
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Max Attempts */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Max Allowed Attempts per Student
              </label>
              <div className="flex gap-2">
                {[
                  { value: 1, label: "1 Attempt" },
                  { value: 2, label: "2 Attempts" },
                  { value: 3, label: "3 Attempts" },
                  { value: 0, label: "Unlimited (0)" },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, max_attempts: opt.value }))}
                    className={cn(
                      "px-4 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer",
                      form.max_attempts === opt.value
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Next Button */}
            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (!form.title.trim()) {
                    showAlert("Please enter a title for the quiz", { title: "Title Required", variant: "warning" });
                    return;
                  }
                  setStep(2);
                }}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <span>Continue to Questions</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Questions & AI Generator */}
        {step === 2 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-indigo-600" />
                  Quiz Questions ({questions.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Add questions manually with 4 choices or generate distinct subject-specific questions with AI.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={addMcqSingle}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5 text-blue-600" /> + MCQ Single (4 options)
                </button>
                <button
                  type="button"
                  onClick={addMcqMulti}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5 text-indigo-600" /> + MCQ Multi
                </button>
                <button
                  type="button"
                  onClick={addDesc}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5 text-amber-600" /> + Descriptive
                </button>
              </div>
            </div>

            {/* AI Generator Panel */}
            <div className="p-5 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl bg-gradient-to-br from-indigo-50/50 via-slate-50 to-blue-50/40 dark:from-indigo-950/20 dark:via-slate-900 dark:to-blue-950/20 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  AI Question Generator (Generates Unique Questions with 4 Choices)
                </h4>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Topic-grounded
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div className="sm:col-span-2">
                  <select
                    value={ai.source}
                    onChange={e => setAi({ ...ai, source: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="topic">Topic</option>
                    <option value="book">Book</option>
                    <option value="prompt">Prompt</option>
                  </select>
                </div>

                <div className="sm:col-span-6">
                  {ai.source === "book" ? (
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
                        if (foundBook && !form.title) {
                          setForm(prev => ({ ...prev, title: `${foundBook.title} Assessment` }));
                        }
                      }}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">-- Select Book from Library ({books.length} Books Available) --</option>
                      {books.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.title} {b.author ? `— ${b.author}` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={ai.topic}
                      onChange={e => setAi({ ...ai, topic: e.target.value })}
                      placeholder={
                        ai.source === "prompt"
                          ? "Custom prompt (e.g. 'Generate 6 Science questions on thermodynamics...')"
                          : "Topic (e.g. 'Science — Laws of Motion and Energy')"
                      }
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                  )}
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 px-2.5">
                    <span className="text-[11px] text-slate-500 whitespace-nowrap">Count:</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={ai.num_questions}
                      onChange={e => setAi({ ...ai, num_questions: Math.max(1, Number(e.target.value)) })}
                      className="w-full text-xs font-bold text-slate-900 dark:text-white bg-transparent text-center focus:outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={generateAI}
                    disabled={loading}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    {loading ? (
                      <>
                        <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        Generate
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Questions List */}
            {questions.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <HelpCircle className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Questions Added Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click "+ MCQ Single", "+ MCQ Multi", or use the AI Generator above to populate questions for this quiz.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-5 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3 bg-white dark:bg-slate-800/80 shadow-2xs transition-all hover:border-slate-300 dark:hover:border-slate-600"
                  >
                    {/* Header */}
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
                                    name={`q-${idx}-correct`}
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
                        <textarea
                          value={q.rubric}
                          onChange={e => {
                            const v = [...questions];
                            v[idx].rubric = e.target.value;
                            setQuestions(v);
                          }}
                          placeholder="Grading Rubric (e.g. Conceptual accuracy 40%, Technical reasoning 40%)..."
                          rows={2}
                          className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                        <textarea
                          value={q.expected_answer}
                          onChange={e => {
                            const v = [...questions];
                            v[idx].expected_answer = e.target.value;
                            setQuestions(v);
                          }}
                          placeholder="Model / Reference Expected Answer..."
                          rows={2}
                          className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Step 2 Footer */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Details
              </button>

              <button
                type="button"
                onClick={() => {
                  if (questions.length === 0) {
                    showAlert("Please add or generate at least 1 question before proceeding", {
                      title: "No Questions",
                      variant: "warning",
                    });
                    return;
                  }
                  setStep(3);
                }}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <span>Continue to Assignments</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Groups & Settings */}
        {step === 3 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                Assign to Groups & Access Rules
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Select which student groups will have access to attempt this quiz.
              </p>
            </div>

            {/* Groups Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Target Student Groups ({groupIds.length} selected):
                </span>
                {groups.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setGroupIds(groups.map(g => g.id))}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
                    >
                      Select All
                    </button>
                    <span className="text-xs text-slate-400">|</span>
                    <button
                      type="button"
                      onClick={() => setGroupIds([])}
                      className="text-xs text-slate-500 hover:underline cursor-pointer font-medium"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/40">
                {groups.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                    No student groups found. You can create groups in Admin → Manage Users → Groups.
                  </p>
                ) : (
                  groups.map((g: any) => {
                    const isChecked = groupIds.includes(g.id);
                    return (
                      <label
                        key={g.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer select-none",
                          isChecked
                            ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-950 dark:text-blue-200"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e =>
                            setGroupIds(prev =>
                              e.target.checked ? [...prev, g.id] : prev.filter(id => id !== g.id)
                            )
                          }
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{g.name}</p>
                          {g.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{g.description}</p>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-md">
                          ID: {g.id}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Additional Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.shuffle_questions}
                  onChange={e => setForm({ ...form, shuffle_questions: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Shuffle Question Order</p>
                  <p className="text-[11px] text-slate-500">Randomize question sequence for each attempt</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.show_result === "immediately"}
                  onChange={e =>
                    setForm({
                      ...form,
                      show_result: e.target.checked ? "immediately" : "after_all_graded",
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Instant Results</p>
                  <p className="text-[11px] text-slate-500">Show score immediately upon submission</p>
                </div>
              </label>
            </div>

            {/* Step 3 Footer */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Questions
              </button>

              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <span>Proceed to Schedulers & Submit</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Schedulers and Submit */}
        {step === 4 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Step 4: Quiz Schedulers & Review
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Configure scheduling timeframe, active status, and review before final publish.
                </p>
              </div>

              <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-bold">
                Step 4 of 4
              </span>
            </div>

            {/* Dedicated Schedulers Panel */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span>Quiz Activation & Schedulers</span>
                </label>
                <span className="text-xs text-slate-400 font-medium">Dual scheduler timing window</span>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Quiz Status
                  </label>
                  <select
                    value={form.status}
                    onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="published">Enabled (Active)</option>
                    <option value="scheduled">Scheduled (Active by Schedulers)</option>
                    <option value="disabled">Disabled (Hidden)</option>
                    <option value="draft">Draft (Admin only)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Scheduler 1: Enable At (Start)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.available_from}
                    onChange={e => {
                      const val = e.target.value;
                      setForm(prev => ({
                        ...prev,
                        available_from: val,
                        status: val && prev.status === "published" ? "scheduled" : prev.status,
                      }));
                    }}
                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400">When the quiz opens for students.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Scheduler 2: Disable At (End)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.available_until}
                    onChange={e => {
                      const val = e.target.value;
                      setForm(prev => ({
                        ...prev,
                        available_until: val,
                        status: val && prev.status === "published" ? "scheduled" : prev.status,
                      }));
                    }}
                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400">When the quiz closes/disables.</p>
                </div>
              </div>

              {form.available_from && form.available_until && (
                <div className="text-xs p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 flex items-center justify-between">
                  <span>
                    Active Window: {Math.max(0, Math.round((new Date(form.available_until).getTime() - new Date(form.available_from).getTime()) / (60 * 1000)))} minutes
                  </span>
                  <span className="font-semibold">
                    (Min required for this quiz: {form.duration_minutes} minutes)
                  </span>
                </div>
              )}
            </div>

            {/* Quiz Overview Summary Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-slate-800 dark:to-slate-800/80 border border-blue-100 dark:border-slate-700 space-y-3">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">{form.title || "Untitled Quiz"}</h4>
              {form.description && (
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{form.description}</p>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[11px] text-slate-400 block font-medium">Duration</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{formattedDuration}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[11px] text-slate-400 block font-medium">Pass Percentage</span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">{form.pass_percentage}%</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[11px] text-slate-400 block font-medium">Questions</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{questions.length} Qs ({totalMarks} marks)</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[11px] text-slate-400 block font-medium">Assigned Groups</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">{groupIds.length} Groups</span>
                </div>
              </div>
            </div>

            {/* Instructions Preview */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Student Instructions Preview:
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {form.instructions}
              </p>
            </div>

            {/* Questions Inspection List */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Questions Preview ({questions.length}):
              </span>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {questions.map((q, qidx) => (
                  <div
                    key={qidx}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2.5"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">
                        Q{qidx + 1}. {q.prompt || "Empty Prompt"}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 font-mono">
                        {q.marks} mark{q.marks > 1 ? "s" : ""} • {q.type}
                      </span>
                    </div>

                    {q.type?.startsWith("mcq") && q.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt: any, oidx: number) => {
                          const optionLetter = String.fromCharCode(65 + oidx);
                          return (
                            <div
                              key={oidx}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded-lg text-xs font-medium border",
                                opt.is_correct
                                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                                  : "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                              )}
                            >
                              <span className="font-bold">{optionLetter}.</span>
                              <span className="flex-1 truncate">{opt.text || "Empty option"}</span>
                              {opt.is_correct && (
                                <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">
                                  ✓ Correct
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.explanation && (
                      <p className="text-[11px] text-slate-500 italic pt-1">
                        <b>Explanation:</b> {q.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Submission Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full sm:w-auto px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Edit
              </button>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => submit(false)}
                  disabled={loading}
                  className="flex-1 sm:flex-none px-5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold cursor-pointer disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => submit(true)}
                  disabled={loading}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Publish & Assign Quiz
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
