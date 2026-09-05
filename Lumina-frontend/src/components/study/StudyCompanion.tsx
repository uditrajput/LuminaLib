"use client";

import { useState, useEffect } from "react";
import apiClient from "@/services/apiClient";
import { getBooks } from "@/services/bookService";
import {
  Sparkles,
  Layers,
  HelpCircle,
  FileText,
  Brain,
  Download,
  CheckCircle2,
  XCircle,
  Check,
  BookOpen,
  RotateCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InteractiveMindMap } from "./InteractiveMindMap";

export function StudyCompanion({ bookId }: { bookId?: number }) {
  const [type, setType] = useState<"flashcards" | "mcq" | "summary" | "mindmap">("flashcards");
  const [selectedBookId, setSelectedBookId] = useState<string>(bookId ? String(bookId) : "");
  const [books, setBooks] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});

  useEffect(() => {
    if (bookId) {
      setSelectedBookId(String(bookId));
    } else {
      getBooks(1, 100, "", "all")
        .then(res => setBooks(res.items || []))
        .catch(() => {
          getBooks(1, 100, "", "public")
            .then(res => setBooks(res.items || []))
            .catch(() => {});
        });
    }
  }, [bookId]);

  const generate = async () => {
    setLoading(true);
    setFlippedCards({});
    setSelectedAnswers({});
    try {
      const bId = selectedBookId ? Number(selectedBookId) : (bookId || undefined);
      const res = await apiClient.post("/study/generate", {
        book_id: bId,
        type,
        count: 5,
        source: bId ? "book" : "all_highlights",
      });
      setData(res.data);
    } catch (e) {
      console.error("Failed to generate study companion items", e);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!data?.data || type !== "flashcards") return;
    const cards = data.data as any[];
    const rows = [
      ["Question", "Answer"],
      ...cards.map((f: any) => [
        `"${(f.front || "").replace(/"/g, '""')}"`,
        `"${(f.back || "").replace(/"/g, '""')}"`
      ])
    ];
    const csvContent = "\uFEFF" + rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `luminalib_${(data.topic || "study").toLowerCase().replace(/[^a-z0-9]+/g, "_")}_flashcards.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="h-4 w-4" />
            </span>
            AI Study Companion
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Instantly generate active recall flashcards, practice MCQs, summaries, and visual mindmaps.
          </p>
        </div>

        {/* Book Selector if on Dashboard */}
        {!bookId && books.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5 text-slate-400" /> Source:
            </span>
            <select
              value={selectedBookId}
              onChange={e => setSelectedBookId(e.target.value)}
              className="p-1.5 px-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none max-w-[240px] truncate"
            >
              <option value="">All Highlights & Library</option>
              {books.map(b => (
                <option key={b.id} value={b.id}>
                  {b.title} {b.author ? `(${b.author})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {[
          { id: "flashcards", label: "Flashcards", icon: Layers },
          { id: "mcq", label: "MCQs Practice", icon: HelpCircle },
          { id: "summary", label: "Study Summary", icon: FileText },
          { id: "mindmap", label: "MindMap", icon: Brain },
        ].map(tab => {
          const isSelected = type === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setType(tab.id as any)}
              className={cn(
                "py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition cursor-pointer",
                isSelected
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Generate Action Button */}
      <button
        onClick={generate}
        disabled={loading}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
      >
        {loading ? (
          <>
            <RotateCw className="h-3.5 w-3.5 animate-spin" />
            Generating {type}...
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            Generate {type.charAt(0).toUpperCase() + type.slice(1)}
          </>
        )}
      </button>

      {/* Results Container */}
      {data && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Generated Study Material ({data.topic || "Overview"}):
            </span>
            {type === "flashcards" && (
              <button
                onClick={exportCsv}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" /> Export Flashcards (.csv)
              </button>
            )}
          </div>

          {/* FLASHCARDS VIEW */}
          {type === "flashcards" && (
            <div className="space-y-3 max-h-96 overflow-y-auto p-1">
              {(data.data || []).map((f: any, i: number) => {
                const isFlipped = !!flippedCards[i];
                return (
                  <div
                    key={i}
                    onClick={() => setFlippedCards(prev => ({ ...prev, [i]: !prev[i] }))}
                    className={cn(
                      "p-4 rounded-2xl border transition-all cursor-pointer select-none",
                      isFlipped
                        ? "bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800"
                        : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-indigo-200"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400">
                        Card #{i + 1} • {isFlipped ? "Answer" : "Question"}
                      </span>
                      <span className="text-[10px] text-slate-400">Click to flip ↷</span>
                    </div>
                    {isFlipped ? (
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 mr-1">A:</span>
                        {f.back}
                      </p>
                    ) : (
                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
                        <span className="text-indigo-600 dark:text-indigo-400 mr-1">Q:</span>
                        {f.front}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* MCQS VIEW */}
          {type === "mcq" && (
            <div className="space-y-4 max-h-96 overflow-y-auto p-1">
              {(data.data || []).map((m: any, i: number) => {
                const userChoice = selectedAnswers[i];
                const hasAnswered = userChoice !== undefined;
                return (
                  <div
                    key={i}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 space-y-2.5"
                  >
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {i + 1}. {m.question}
                    </p>

                    <div className="space-y-1.5">
                      {(m.options || []).map((opt: string, oi: number) => {
                        const isCorrect = oi === m.answer;
                        const isSelected = userChoice === oi;
                        return (
                          <button
                            key={oi}
                            disabled={hasAnswered}
                            onClick={() => setSelectedAnswers(prev => ({ ...prev, [i]: oi }))}
                            className={cn(
                              "w-full p-2 rounded-xl text-xs font-medium text-left border transition flex items-center justify-between",
                              hasAnswered
                                ? isCorrect
                                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 text-emerald-900 dark:text-emerald-100 font-bold"
                                  : isSelected
                                  ? "bg-red-50 dark:bg-red-900/30 border-red-400 text-red-900 dark:text-red-100"
                                  : "bg-white/40 dark:bg-slate-800/20 border-slate-200 dark:border-slate-700 text-slate-400"
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300 cursor-pointer"
                            )}
                          >
                            <span>
                              <span className="font-bold mr-2">{String.fromCharCode(65 + oi)}.</span>
                              {opt}
                            </span>
                            {hasAnswered && isCorrect && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                            {hasAnswered && isSelected && !isCorrect && <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {hasAnswered && m.explanation && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200/80 dark:border-slate-700">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Explanation:</span> {m.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* SUMMARY VIEW */}
          {type === "summary" && (
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 space-y-3 max-h-96 overflow-y-auto">
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                {data.data?.summary}
              </p>
              {Array.isArray(data.data?.bullets) && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Key Takeaways:</span>
                  {data.data.bullets.map((b: string, bi: number) => (
                    <div key={bi} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VISUAL MINDMAP VIEW (Interactive matching design in Image 2) */}
          {type === "mindmap" && (
            <div className="pt-1">
              <InteractiveMindMap data={data.data} topicTitle={data.topic} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
