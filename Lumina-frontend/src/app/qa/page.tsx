"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { askQuestion, QAResponse, SourceExcerpt } from "@/services/qaService";
import { Brain, Send, User, Loader2, BookOpen, AlertCircle, Bookmark, ChevronDown, Mic, Volume2, VolumeX, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    excerpts?: SourceExcerpt[];
    error?: boolean;
}

function FormattedMessageContent({ content, onAskQuestion }: { content: string; onAskQuestion?: (q: string) => void }) {
    if (!content) return null;

    let processed = content;

    // Normalize inline pipe tables if lines were concatenated on a single line
    if (processed.includes("|---|") || processed.includes("| --- |")) {
        processed = processed.replace(/([^\n])\s*\|(\s*#|\s*[-:]+)/g, "$1\n|$2");
    }

    const lines = processed.split("\n");
    const elements: React.ReactNode[] = [];

    let currentTableRows: string[][] = [];
    let tableKey = 0;
    let textBuffer: Array<{ text: string; isQuestion?: boolean }> = [];

    const flushTextBuffer = () => {
        if (textBuffer.length > 0) {
            elements.push(
                <div key={`text-${elements.length}`} className="space-y-1.5">
                    {textBuffer.map((item, idx) => {
                        const qText = item.text.replace(/^\d+[\.\)]\s+/, "").trim();
                        return (
                            <div key={idx} className="leading-relaxed">
                                <p className="whitespace-pre-wrap">{item.text}</p>
                                {onAskQuestion && item.isQuestion && (
                                    <div className="pt-1 pb-1">
                                        <button
                                            type="button"
                                            onClick={() => onAskQuestion(`Answer this question: ${qText}`)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-900/70 text-purple-700 dark:text-purple-300 font-bold text-xs rounded-xl border border-purple-300/60 dark:border-purple-700/60 transition shadow-sm"
                                        >
                                            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                                            <span>Answer Question</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            );
            textBuffer = [];
        }
    };

    const flushTable = () => {
        if (currentTableRows.length > 0) {
            const rows = currentTableRows.filter(
                (row) => !row.every((cell) => /^[-:\s]+$/.test(cell))
            );

            if (rows.length > 0) {
                const rawHeader = rows[0];
                const bodyRows = rows.slice(1);

                // Add Answer column if onAskQuestion is available
                const hasActionCol = Boolean(onAskQuestion);
                const header = hasActionCol ? [...rawHeader, "Action"] : rawHeader;

                // Find question column index (defaults to index 1 if available, otherwise index 0)
                let qColIdx = rawHeader.findIndex((h) => /question|q/i.test(h));
                if (qColIdx === -1) qColIdx = Math.min(1, rawHeader.length - 1);

                elements.push(
                    <div key={`table-${tableKey++}`} className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-purple-100/90 dark:bg-purple-950/70 border-b border-slate-200 dark:border-slate-700">
                                    {header.map((col, idx) => (
                                        <th key={idx} className="px-3.5 py-2.5 font-bold text-purple-950 dark:text-purple-200 border-r last:border-r-0 border-slate-200 dark:border-slate-700">
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {bodyRows.map((row, rIdx) => {
                                    const questionText = row[qColIdx] || row.join(" ");
                                    return (
                                        <tr key={rIdx} className={cn(rIdx % 2 === 0 ? "bg-white dark:bg-slate-900/40" : "bg-slate-50/50 dark:bg-slate-800/30", "hover:bg-purple-50/40 dark:hover:bg-purple-900/20 transition-colors")}>
                                            {rawHeader.map((_, cIdx) => (
                                                <td key={cIdx} className="px-3.5 py-2 text-slate-700 dark:text-slate-200 border-r last:border-r-0 border-slate-100 dark:border-slate-800/60">
                                                    {row[cIdx] !== undefined ? row[cIdx] : ""}
                                                </td>
                                            ))}
                                            {hasActionCol && (
                                                <td className="px-3.5 py-2 border-slate-100 dark:border-slate-800/60 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => onAskQuestion && onAskQuestion(`Answer this question: ${questionText}`)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-[11px] rounded-lg shadow-sm transition"
                                                    >
                                                        <Sparkles className="h-3 w-3 text-purple-200" />
                                                        <span>Answer</span>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                );
            }
            currentTableRows = [];
        }
    };

    lines.forEach((line) => {
        let trimmed = line.trim();
        const isNumberedTableRow = currentTableRows.length > 0 && /^\d+[\s|.]/.test(trimmed) && trimmed.includes("|");

        if (isNumberedTableRow && !trimmed.startsWith("|")) {
            trimmed = `| ${trimmed}`;
        }

        const isTableLine = trimmed.startsWith("|") || (trimmed.includes("|") && (trimmed.match(/\|/g) || []).length >= 2);

        if (isTableLine && trimmed.length > 1) {
            flushTextBuffer();
            let cleanLine = trimmed;
            if (cleanLine.startsWith("|")) cleanLine = cleanLine.slice(1);
            if (cleanLine.endsWith("|")) cleanLine = cleanLine.slice(0, -1);
            const cells = cleanLine.split("|").map((c) => c.trim());
            currentTableRows.push(cells);
        } else {
            flushTable();
            if (trimmed) {
                const isQuestion = trimmed.endsWith("?") || /^\d+[\.\)]\s+/.test(trimmed);
                textBuffer.push({ text: line, isQuestion });
            } else if (textBuffer.length > 0) {
                flushTextBuffer();
            }
        }
    });

    flushTable();
    flushTextBuffer();

    return <div className="space-y-2">{elements}</div>;
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
    const [isListening, setIsListening] = useState(false);
    const [isSpeakingTTS, setIsSpeakingTTS] = useState(false);
    const [freqLevels, setFreqLevels] = useState<number[]>([0.3, 0.6, 0.9, 0.5, 0.2]);

    const bottomRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const latestInputRef = useRef<string>("");
    const isListeningRef = useRef<boolean>(false);

    useEffect(() => {
        latestInputRef.current = input;
    }, [input]);

    useEffect(() => {
        isListeningRef.current = isListening;
    }, [isListening]);

    const toggleExcerpts = (id: string) => {
        setExpandedExcerpts(prev => ({ ...prev, [id]: !prev[id] }));
    };

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const stopTTS = useCallback(() => {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }
        setIsSpeakingTTS(false);
    }, []);

    const speakAnswer = useCallback((text: string) => {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();

            let cleanText = text;

            // Strip page number phrases e.g. "On Page 12", "According to page 45", "(page 3)", "p. 14"
            cleanText = cleanText.replace(/\b(on|at|from|see|in|according to)\s+(pages?|p\.)\s*\d+(\s*[-–to]\s*\d+)?\b,?/gi, "");
            cleanText = cleanText.replace(/\b(pages?|p\.)\s*\d+(\s*[-–to]\s*\d+)?\b/gi, "");
            cleanText = cleanText.replace(/\bpage\s+numbers?\s*\d+\b/gi, "");
            cleanText = cleanText.replace(/\[\s*page\s*\d+.*?\]/gi, "");
            cleanText = cleanText.replace(/\(\s*page\s*\d+.*?\)/gi, "");

            // Strip citations / chunk references e.g. [1], (excerpt 2)
            cleanText = cleanText.replace(/\[\s*\d+\s*\]/g, "");
            cleanText = cleanText.replace(/\(\s*(chunk|excerpt)\s*\d+\s*\)/gi, "");

            // Strip table formatting and action labels
            cleanText = cleanText.replace(/\|\s*(Action|Answer)\s*\|/gi, "");
            cleanText = cleanText.replace(/\|/g, " ");
            cleanText = cleanText.replace(/[-:_]{3,}/g, " ");
            cleanText = cleanText.replace(/[*#`_~]/g, "");

            // Clean up empty parens/brackets and extra spacing
            cleanText = cleanText.replace(/\(\s*\)/g, "");
            cleanText = cleanText.replace(/\[\s*\]/g, "");
            cleanText = cleanText.replace(/\s+,\s+/g, ", ");
            cleanText = cleanText.replace(/\s+/g, " ").trim();

            if (!cleanText) return;

            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.rate = 1.0;
            utterance.onstart = () => setIsSpeakingTTS(true);
            utterance.onend = () => setIsSpeakingTTS(false);
            utterance.onerror = () => setIsSpeakingTTS(false);
            window.speechSynthesis.speak(utterance);
        }
    }, []);

    const stopVoice = useCallback(() => {
        setIsListening(false);
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        if (audioCtxRef.current) {
            audioCtxRef.current.close().catch(() => {});
            audioCtxRef.current = null;
        }
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {}
            recognitionRef.current = null;
        }
        setFreqLevels([0.3, 0.6, 0.9, 0.5, 0.2]);
    }, []);

    const triggerSendRef = useRef<((textOverride?: string) => Promise<void>) | null>(null);

    const resetSilenceTimer = useCallback(() => {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }
        silenceTimerRef.current = setTimeout(() => {
            const currentText = latestInputRef.current.trim();
            if (currentText && triggerSendRef.current) {
                triggerSendRef.current(currentText);
            }
        }, 1800);
    }, []);

    const startVoice = async () => {
        stopTTS();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                const ctx = new AudioContextClass();
                audioCtxRef.current = ctx;
                const analyser = ctx.createAnalyser();
                analyser.fftSize = 32;
                analyserRef.current = analyser;
                const source = ctx.createMediaStreamSource(stream);
                source.connect(analyser);

                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                const updateWaves = () => {
                    analyser.getByteFrequencyData(dataArray);
                    const b1 = (dataArray[1] || 10) / 255;
                    const b2 = (dataArray[3] || 20) / 255;
                    const b3 = (dataArray[5] || 35) / 255;
                    const b4 = (dataArray[7] || 20) / 255;
                    const b5 = (dataArray[9] || 10) / 255;
                    setFreqLevels([b1, b2, b3, b4, b5]);
                    animFrameRef.current = requestAnimationFrame(updateWaves);
                };
                updateWaves();
            }

            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = "en-US";

                recognition.onresult = (event: any) => {
                    let transcript = "";
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        transcript += event.results[i][0].transcript;
                    }
                    if (transcript) {
                        setInput(transcript);
                        resetSilenceTimer();
                    }
                };

                recognition.onerror = (err: any) => {
                    console.warn("Speech recognition error:", err);
                };

                recognition.onend = () => {
                    if (isListeningRef.current && latestInputRef.current.trim() && triggerSendRef.current) {
                        triggerSendRef.current(latestInputRef.current.trim());
                    }
                };

                recognition.start();
                recognitionRef.current = recognition;
            }

            setIsListening(true);
        } catch (err) {
            console.error("Mic access failed:", err);
            stopVoice();
        }
    };

    const toggleMic = () => {
        if (isListening) {
            const currentText = input.trim();
            stopVoice();
            if (currentText) {
                send(currentText);
            }
        } else {
            startVoice();
        }
    };

    const send = async (overrideText?: string) => {
        const question = (overrideText ?? input).trim();
        if (!question || loading) return;

        const wasVoiceUsed = isListening || Boolean(overrideText);
        if (isListening) {
            stopVoice();
        }

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
            if (wasVoiceUsed && response.answer) {
                speakAnswer(response.answer);
            }
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

    triggerSendRef.current = send;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    useEffect(() => {
        return () => {
            stopVoice();
            stopTTS();
        };
    }, [stopVoice, stopTTS]);

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

                            <div
                                className={cn(
                                    "max-w-[75%] space-y-2",
                                    msg.role === "user" ? "items-end" : "items-start"
                                )}
                            >
                                <div
                                    className={cn(
                                        "rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm flex items-start justify-between gap-3",
                                        msg.role === "user"
                                            ? "bg-blue-600 text-white rounded-tr-sm"
                                            : msg.error
                                                ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800/50 rounded-tl-sm"
                                                : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-tl-sm"
                                    )}
                                >
                                    <div className="flex-1 overflow-hidden">
                                        <FormattedMessageContent
                                            content={msg.content}
                                            onAskQuestion={msg.role === "assistant" ? (q) => send(q) : undefined}
                                        />
                                    </div>


                                    {msg.role === "assistant" && (

                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (isSpeakingTTS) {
                                                    stopTTS();
                                                } else {
                                                    speakAnswer(msg.content);
                                                }
                                            }}
                                            className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                            title={isSpeakingTTS ? "Stop Speaking" : "Read Aloud"}
                                        >
                                            {isSpeakingTTS ? <VolumeX className="h-4 w-4 text-red-500 animate-pulse" /> : <Volume2 className="h-4 w-4" />}
                                        </button>
                                    )}
                                </div>

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

                {/* Input Area */}
                <div className="shrink-0 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="relative group/input">
                        <div className="absolute -inset-[2px] rounded-[22px] bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 opacity-0 group-focus-within/input:opacity-60 blur-sm transition-opacity duration-500 -z-10" />

                        <div className={cn(
                            "relative flex items-end gap-3 bg-white dark:bg-slate-800 rounded-2xl px-5 py-4",
                            "shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.06),0_16px_32px_rgba(0,0,0,0.04)]",
                            "focus-within:shadow-[0_2px_4px_rgba(99,102,241,0.1),0_8px_20px_rgba(99,102,241,0.15),0_16px_40px_rgba(99,102,241,0.1)]",
                            "transition-all duration-300"
                        )}>

                            <textarea
                                id="qa-input"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={isListening ? "Listening to your voice..." : "Ask a question about your library…"}
                                rows={1}
                                className="relative flex-1 resize-none bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none border-none outline-none focus:ring-0 leading-relaxed z-10"
                            />

                            {/* Stop TTS Voice Output Button */}
                            {isSpeakingTTS && (
                                <button
                                    type="button"
                                    id="qa-stop-tts-btn"
                                    aria-label="Stop TTS Voice"
                                    onClick={stopTTS}
                                    className={cn(
                                        "relative h-10 px-3 rounded-xl shrink-0 z-10 flex items-center gap-1.5 text-xs font-bold transition-all duration-200 animate-fade-in",
                                        "bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 hover:from-pink-500 hover:to-red-500 text-white shadow-[0_4px_12px_rgba(225,29,72,0.4)] hover:shadow-[0_6px_20px_rgba(225,29,72,0.5)] hover:-translate-y-0.5",
                                        "active:translate-y-0"
                                    )}
                                    title="Stop Voice Output"
                                >
                                    <VolumeX className="h-4 w-4 text-white animate-pulse" />
                                    <span className="hidden sm:inline">Stop Speaking</span>
                                </button>
                            )}

                            {/* Mic Button & Listening Pill Container */}
                            <div className="relative shrink-0">
                                {isListening && (
                                    <div className="absolute -top-11 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-800/80 px-3.5 py-1.5 rounded-full shadow-xl animate-fade-in whitespace-nowrap">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                                        </span>
                                        Listening… Speak your question
                                    </div>
                                )}
                                <button
                                    type="button"
                                    id="qa-voice-btn"
                                    aria-label={isListening ? "Stop listening" : "Start listening"}
                                    onClick={toggleMic}
                                    className={cn(
                                        "relative h-10 px-3 rounded-xl shrink-0 z-10 flex items-center justify-center gap-1.5 transition-all duration-300",
                                        isListening
                                            ? "bg-gradient-to-r from-red-600 via-purple-600 to-pink-600 text-white shadow-[0_0_16px_rgba(239,68,68,0.5)] ring-2 ring-red-400"
                                            : "bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-[0_4px_12px_rgba(147,51,234,0.3)] hover:shadow-[0_6px_20px_rgba(147,51,234,0.4)] hover:-translate-y-0.5"
                                    )}
                                    title={isListening ? "Stop Listening" : "Start Voice Input"}
                                >
                                    {isListening ? (
                                        <>
                                            <div className="flex items-center gap-[2.5px] h-4">
                                                {freqLevels.map((val, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="w-[3px] bg-white rounded-full transition-all duration-75"
                                                        style={{ height: `${Math.max(4, Math.min(18, val * 22))}px` }}
                                                    />
                                                ))}
                                            </div>
                                            <Mic className="h-3.5 w-3.5 text-white ml-0.5 shrink-0 animate-pulse" />
                                        </>
                                    ) : (
                                        <Mic className="h-4 w-4 text-white shrink-0" />
                                    )}
                                </button>
                            </div>

                            <Button
                                id="qa-send-btn"
                                aria-label="Send"
                                onClick={() => send()}
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
