"use client";

import React, { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { askQuestion, QAResponse, SourceExcerpt } from "@/services/qaService";
import { Brain, Send, User, Loader2, BookOpen, AlertCircle, Bookmark, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    excerpts?: SourceExcerpt[];
    error?: boolean;
}

export default function QAPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content: "Hello! I'm LuminaLib's AI assistant. Ask me anything about the books in your library — I'll search through the ingested documents and provide precise, context-aware answers.",
        },
    ]);
    const [expandedExcerpts, setExpandedExcerpts] = useState<Record<string, boolean>>({});
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    const toggleExcerpts = (id: string) => {
        setExpandedExcerpts(prev => ({ ...prev, [id]: !prev[id] }));
    };

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const send = async () => {
        const question = input.trim();
        if (!question || loading) return;

        const userMsg: Message = { id: Date.now().toString(), role: "user", content: question };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const response: QAResponse = await askQuestion(question);
            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: response.answer,
                    excerpts: response.excerpts,
                },
            ]);
        } catch (err: any) {
            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content:
                        err?.response?.data?.error_message ||
                        err?.response?.data?.detail ||
                        "Sorry, I couldn't retrieve an answer. Please ensure documents are ingested.",
                    error: true,
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto animate-fade-in">
                {/* Header */}
                <div className="flex items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800 mb-6 shrink-0">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-2xl shadow-md">
                        <Brain className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">AI Q&amp;A</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Ask questions about your ingested library documents</p>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex gap-3 animate-fade-in",
                                msg.role === "user" ? "flex-row-reverse" : "flex-row"
                            )}
                        >
                            {/* Avatar */}
                            <div
                                className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                    msg.role === "user"
                                        ? "bg-blue-600 text-white"
                                        : msg.error
                                            ? "bg-red-100 text-red-500"
                                            : "bg-gradient-to-br from-indigo-500 to-violet-600 text-white"
                                )}
                            >
                                {msg.role === "user" ? (
                                    <User className="h-4 w-4" />
                                ) : msg.error ? (
                                    <AlertCircle className="h-4 w-4" />
                                ) : (
                                    <Brain className="h-4 w-4" />
                                )}
                            </div>

                            {/* Bubble */}
                            <div
                                className={cn(
                                    "max-w-[75%] space-y-3",
                                    msg.role === "user" ? "items-end" : "items-start"
                                )}
                            >
                                <div
                                    className={cn(
                                        "rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm",
                                        msg.role === "user"
                                            ? "bg-blue-600 text-white rounded-tr-sm"
                                            : msg.error
                                                ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800/50 rounded-tl-sm"
                                                : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-tl-sm"
                                    )}
                                >
                                    {msg.content}
                                </div>

                                {/* Excerpts Toggleable */}
                                {msg.excerpts && msg.excerpts.length > 0 && (
                                    <div className="space-y-2">
                                        <button
                                            onClick={() => toggleExcerpts(msg.id)}
                                            className="text-xs font-bold text-slate-500 flex items-center gap-1.5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                        >
                                            <div className="p-1 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                                <BookOpen className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                            Source Excerpts
                                            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200 text-slate-400", expandedExcerpts[msg.id] ? "rotate-180" : "")} />
                                        </button>

                                        {expandedExcerpts[msg.id] && (
                                            <div className="space-y-2 animate-fade-in origin-top">
                                                {msg.excerpts.map((excerpt, i) => (
                                                    <div key={i} className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-800/30 rounded-xl px-4 py-3 text-xs text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed space-y-1">
                                                        {excerpt.book_title && (
                                                            <div className="flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider opacity-70 mb-1 text-indigo-900 dark:text-indigo-200">
                                                                <Bookmark className="h-2.5 w-2.5" />
                                                                {excerpt.book_title}
                                                            </div>
                                                        )}
                                                        <div className="line-clamp-6 italic">
                                                            &ldquo;{excerpt.content}&rdquo;
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Loading indicator */}
                    {loading && (
                        <div className="flex gap-3 animate-fade-in">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shrink-0">
                                <Brain className="h-4 w-4" />
                            </div>
                            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-sm px-5 py-3.5 shadow-sm flex items-center gap-2">
                                <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
                                <span className="text-sm text-slate-500 dark:text-slate-400">Thinking…</span>
                            </div>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>

                {/* Input — 3D effect */}
                <div className="shrink-0 pt-4 border-t border-slate-100 dark:border-slate-800">
                    {/* Outer 3D wrapper — creates depth with layered shadows */}
                    <div className="relative group/input">
                        {/* Gradient glow ring behind — visible on focus */}
                        <div className="absolute -inset-[2px] rounded-[22px] bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 opacity-0 group-focus-within/input:opacity-60 blur-sm transition-opacity duration-500 -z-10" />

                        {/* Main input container — clean, borderless, soft 3D shadow */}
                        <div className={cn(
                            "relative flex items-end gap-3 bg-white dark:bg-slate-800 rounded-2xl px-5 py-4",
                            // Soft 3D shadow only — no borders
                            "shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.06),0_16px_32px_rgba(0,0,0,0.04)]",
                            // Focus glow
                            "focus-within:shadow-[0_2px_4px_rgba(99,102,241,0.1),0_8px_20px_rgba(99,102,241,0.15),0_16px_40px_rgba(99,102,241,0.1)]",
                            "transition-all duration-300"
                        )}>

                            <textarea
                                id="qa-input"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask a question about your library…"
                                rows={1}
                                className="relative flex-1 resize-none bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none border-none outline-none focus:ring-0 leading-relaxed z-10"
                            />
                            <Button
                                id="qa-send-btn"
                                aria-label="Send"
                                onClick={send}
                                disabled={loading || !input.trim()}
                                size="icon"
                                className={cn(
                                    "relative h-10 w-10 rounded-xl shrink-0 z-10",
                                    "bg-gradient-to-br from-blue-600 to-indigo-600",
                                    "shadow-[0_4px_12px_rgba(79,70,229,0.4)]",
                                    "hover:shadow-[0_6px_20px_rgba(79,70,229,0.5)] hover:-translate-y-0.5",
                                    "active:translate-y-0 active:shadow-[0_2px_6px_rgba(79,70,229,0.3)]",
                                    "transition-all duration-200",
                                    "disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
                                )}
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4 text-white" />}
                            </Button>
                        </div>
                    </div>
                    <p className="text-center text-xs text-slate-400 mt-2.5">Press Enter to send · Shift+Enter for new line</p>
                </div>
            </div>
        </DashboardLayout>
    );
}
