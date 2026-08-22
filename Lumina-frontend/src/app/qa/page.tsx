"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
    askQuestion,
    askQuestionInSession,
    getChatSessions,
    createChatSession,
    getSessionDetail,
    renameChatSession,
    deleteChatSession,
    toggleSaveMessage,
    QAResponse,
    SourceExcerpt,
    ChatSession,
    ChatMessage as APIChatMessage,
} from "@/services/qaService";
import voiceService from "@/services/voiceService";
import ChatSidebar from "@/components/qa/ChatSidebar";
import {
    Brain,
    Send,
    User,
    Loader2,
    BookOpen,
    AlertCircle,
    Bookmark,
    ChevronDown,
    Mic,
    Volume2,
    VolumeX,
    Sparkles,
    Copy,
    Check,
    RotateCcw,
    Edit3,
    BookmarkCheck,
    Menu,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface Message {
    id: string | number;
    role: "user" | "assistant";
    content: string;
    excerpts?: SourceExcerpt[];
    error?: boolean;
    is_saved?: boolean;
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

                const hasActionCol = Boolean(onAskQuestion);
                const header = hasActionCol ? [...rawHeader, "Action"] : rawHeader;

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
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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

    // Prompt edit state
    const [editingMsgId, setEditingMsgId] = useState<string | number | null>(null);
    const [editText, setEditText] = useState("");

    // Feedback copy state
    const [copiedMsgId, setCopiedMsgId] = useState<string | number | null>(null);

    // Voice & Speech synthesis
    const [isListening, setIsListening] = useState(false);
    const [transcribingVoice, setTranscribingVoice] = useState(false);
    const [isSpeakingTTS, setIsSpeakingTTS] = useState(false);
    const [freqLevels, setFreqLevels] = useState<number[]>([0.3, 0.6, 0.9, 0.5, 0.2]);

    const bottomRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const latestInputRef = useRef<string>("");
    const isListeningRef = useRef<boolean>(false);

    // Load Chat Sessions on Mount
    const loadSessions = useCallback(async () => {
        try {
            const list = await getChatSessions();
            setSessions(list);
            if (list.length > 0 && activeSessionId === null) {
                // Select latest session by default
                handleSelectSession(list[0].id);
            }
        } catch (err) {
            console.error("Failed to load chat sessions:", err);
        }
    }, [activeSessionId]);

    useEffect(() => {
        loadSessions();
    }, []);

    const handleSelectSession = async (id: number) => {
        setActiveSessionId(id);
        setLoading(true);
        try {
            const detail = await getSessionDetail(id);
            if (detail.messages && detail.messages.length > 0) {
                setMessages(
                    detail.messages.map((m) => ({
                        id: m.id,
                        role: m.role,
                        content: m.content,
                        excerpts: m.excerpts,
                        is_saved: m.is_saved,
                    }))
                );
            } else {
                setMessages([
                    {
                        id: "welcome",
                        role: "assistant",
                        content: "Start a new conversation in this session! Ask any question about your library books.",
                    },
                ]);
            }
        } catch (err) {
            console.error("Failed to load session messages:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleNewChat = () => {
        setActiveSessionId(null);
        setMessages([
            {
                id: "welcome",
                role: "assistant",
                content: "Started a new chat! Ask me anything about your library books.",
            },
        ]);
    };

    const handleRenameSession = async (id: number, newTitle: string) => {
        try {
            const updated = await renameChatSession(id, newTitle);
            setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: updated.title } : s)));
        } catch (err) {
            console.error("Failed to rename session:", err);
        }
    };

    const handleDeleteSession = async (id: number) => {
        try {
            await deleteChatSession(id);
            setSessions((prev) => prev.filter((s) => s.id !== id));
            if (activeSessionId === id) {
                const remaining = sessions.filter((s) => s.id !== id);
                if (remaining.length > 0) {
                    handleSelectSession(remaining[0].id);
                } else {
                    setActiveSessionId(null);
                    setMessages([
                        {
                            id: "welcome",
                            role: "assistant",
                            content: "Hello! Click '+ New Chat' to start a conversation about your library books.",
                        },
                    ]);
                }
            }
        } catch (err) {
            console.error("Failed to delete session:", err);
        }
    };

    const handleSaveMessageToggle = async (msgId: string | number) => {
        if (typeof msgId !== "number") return;
        try {
            const updated = await toggleSaveMessage(msgId);
            setMessages((prev) =>
                prev.map((m) => (m.id === msgId ? { ...m, is_saved: updated.is_saved } : m))
            );
        } catch (err) {
            console.error("Failed to save message:", err);
        }
    };

    const handleCopyText = (id: string | number, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedMsgId(id);
        setTimeout(() => setCopiedMsgId(null), 2000);
    };

    useEffect(() => {
        latestInputRef.current = input;
    }, [input]);

    useEffect(() => {
        isListeningRef.current = isListening;
    }, [isListening]);

    const toggleExcerpts = (id: string | number) => {
        const key = String(id);
        setExpandedExcerpts((prev) => ({ ...prev, [key]: !prev[key] }));
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
            cleanText = cleanText.replace(/\b(on|at|from|see|in|according to)\s+(pages?|p\.)\s*\d+(\s*[-–to]\s*\d+)?\b,?/gi, "");
            cleanText = cleanText.replace(/\b(pages?|p\.)\s*\d+(\s*[-–to]\s*\d+)?\b/gi, "");
            cleanText = cleanText.replace(/\bpage\s+numbers?\s*\d+\b/gi, "");
            cleanText = cleanText.replace(/\[\s*page\s*\d+.*?\]/gi, "");
            cleanText = cleanText.replace(/\(\s*page\s*\d+.*?\)/gi, "");
            cleanText = cleanText.replace(/\[\s*\d+\s*\]/g, "");
            cleanText = cleanText.replace(/\(\s*(chunk|excerpt)\s*\d+\s*\)/gi, "");
            cleanText = cleanText.replace(/\|\s*(Action|Answer)\s*\|/gi, "");
            cleanText = cleanText.replace(/\|/g, " ");
            cleanText = cleanText.replace(/[-:_]{3,}/g, " ");
            cleanText = cleanText.replace(/[*#`_~]/g, "");
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
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            try {
                mediaRecorderRef.current.stop();
            } catch (e) {}
            mediaRecorderRef.current = null;
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

    const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

    const startVoice = async () => {
        stopTTS();
        setVoiceNotice(null);

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
            } else if (typeof MediaRecorder !== "undefined") {
                // Fallback for Mozilla Firefox and browsers without native SpeechRecognition API
                audioChunksRef.current = [];
                const mimeType = MediaRecorder.isTypeSupported("audio/webm")
                    ? "audio/webm"
                    : MediaRecorder.isTypeSupported("audio/ogg")
                    ? "audio/ogg"
                    : "";

                const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
                recorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) {
                        audioChunksRef.current.push(e.data);
                    }
                };
                recorder.onstop = async () => {
                    if (audioChunksRef.current.length > 0) {
                        const audioBlob = new Blob(audioChunksRef.current, {
                            type: recorder.mimeType || "audio/webm",
                        });
                        setTranscribingVoice(true);
                        const transcript = await voiceService.transcribeAudio(audioBlob);
                        setTranscribingVoice(false);
                        if (transcript && transcript.trim()) {
                            setInput(transcript.trim());
                            if (triggerSendRef.current) {
                                triggerSendRef.current(transcript.trim());
                            }
                        }
                    }
                };
                recorder.start(200);
                mediaRecorderRef.current = recorder;
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

        let currentSessId = activeSessionId;

        // Auto create session if none active
        if (!currentSessId) {
            try {
                const newSess = await createChatSession(question.slice(0, 30));
                setSessions((prev) => [newSess, ...prev]);
                setActiveSessionId(newSess.id);
                currentSessId = newSess.id;
            } catch (err) {
                console.error("Failed to auto create session:", err);
            }
        }

        const wasVoiceUsed = isListening || Boolean(overrideText);
        if (isListening) {
            stopVoice();
        }

        const userMsg: Message = { id: Date.now().toString(), role: "user", content: question };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            let response: QAResponse;
            if (currentSessId) {
                response = await askQuestionInSession(currentSessId, question);
                // Refresh sessions to update title/last message
                loadSessions();
            } else {
                response = await askQuestion(question);
            }

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

    const handleRedo = async (assistantMsgId: string | number, userPromptText: string) => {
        if (loading || !userPromptText) return;

        const assistantIndex = messages.findIndex((m) => m.id === assistantMsgId);
        if (assistantIndex === -1) return;

        setLoading(true);

        let currentSessId = activeSessionId;
        try {
            let response: QAResponse;
            if (currentSessId) {
                response = await askQuestionInSession(currentSessId, userPromptText);
                loadSessions();
            } else {
                response = await askQuestion(userPromptText);
            }

            setMessages((prev) =>
                prev.map((m, idx) =>
                    idx === assistantIndex
                        ? {
                              ...m,
                              content: response.answer,
                              excerpts: response.excerpts,
                              error: false,
                          }
                        : m
                )
            );
        } catch (err: any) {
            setMessages((prev) =>
                prev.map((m, idx) =>
                    idx === assistantIndex
                        ? {
                              ...m,
                              content:
                                  err?.response?.data?.error_message ||
                                  err?.response?.data?.detail ||
                                  "Sorry, I couldn't retrieve an answer. Please ensure documents are ingested.",
                              error: true,
                          }
                        : m
                )
            );
        } finally {
            setLoading(false);
        }
    };

    const handleStartEditPrompt = (msg: Message) => {
        setEditingMsgId(msg.id);
        setEditText(msg.content);
    };

    const handleSaveEditedPrompt = async (msgId: string | number) => {
        const updatedText = editText.trim();
        if (!updatedText || loading) return;

        // 1. Locate edited message target index
        const targetIndex = messages.findIndex((m) => m.id === msgId);
        if (targetIndex === -1) return;

        setEditingMsgId(null);
        setLoading(true);

        // 2. Truncate downstream messages after targetIndex and update prompt in-place
        const updatedUserMsg: Message = {
            id: msgId,
            role: "user",
            content: updatedText,
        };

        const truncatedMessages = [...messages.slice(0, targetIndex), updatedUserMsg];
        setMessages(truncatedMessages);

        let currentSessId = activeSessionId;
        try {
            let response: QAResponse;
            if (currentSessId) {
                response = await askQuestionInSession(currentSessId, updatedText);
                loadSessions();
            } else {
                response = await askQuestion(updatedText);
            }

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

    useEffect(() => {
        return () => {
            stopVoice();
            stopTTS();
        };
    }, [stopVoice, stopTTS]);

    const activeSession = sessions.find((s) => s.id === activeSessionId);
    const isOnlyWelcome = messages.length <= 1;

    const SUGGESTED_PROMPTS = [
        {
            title: "Summarize Borrowed Books",
            subtitle: "Get a concise summary of your library books",
            prompt: "Can you provide a comprehensive summary of my borrowed books?",
            icon: BookOpen,
        },
        {
            title: "Key Themes & Concepts",
            subtitle: "Explore main ideas, theories, and takeaways",
            prompt: "What are the main themes, key concepts, and theories discussed in the books?",
            icon: Brain,
        },
        {
            title: "Study Guide Q&A",
            subtitle: "Generate key practice questions and answers",
            prompt: "Create a list of 5 important study questions and detailed answers based on the books.",
            icon: Sparkles,
        },
        {
            title: "Key Conclusions",
            subtitle: "Extract core findings and final takeaways",
            prompt: "What are the primary conclusions and final takeaways from the ingested documents?",
            icon: Send,
        },
    ];

    return (
        <DashboardLayout>
            <div className="flex h-[calc(100vh-13rem)] min-h-[520px] max-w-7xl mx-auto border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm animate-fade-in">
                {/* Chat Sessions Sidebar */}
                <ChatSidebar
                    sessions={sessions}
                    activeSessionId={activeSessionId}
                    onSelectSession={handleSelectSession}
                    onNewChat={handleNewChat}
                    onRenameSession={handleRenameSession}
                    onDeleteSession={handleDeleteSession}
                    isOpenMobile={isMobileSidebarOpen}
                    onCloseMobile={() => setIsMobileSidebarOpen(false)}
                />

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/40 dark:bg-slate-900/60 min-w-0">
                    {/* Header Bar */}
                    <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur shrink-0 z-10">
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                type="button"
                                onClick={() => setIsMobileSidebarOpen(true)}
                                className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                                <Menu className="h-5 w-5" />
                            </button>

                            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl shadow-sm shrink-0">
                                <Brain className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                                <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                                    {activeSession ? activeSession.title : "AI Q&A Assistant"}
                                </h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    Ask questions about your ingested library books
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Messages Container (Independent Scrollable Area) */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-purple-300 dark:scrollbar-thumb-purple-800 scrollbar-track-transparent">
                        {messages.map((msg, index) => {
                            const isUser = msg.role === "user";

                            // Find preceding user prompt for Redo action on assistant message
                            let prevUserPrompt = "";
                            if (!isUser) {
                                for (let i = index - 1; i >= 0; i--) {
                                    if (messages[i].role === "user") {
                                        prevUserPrompt = messages[i].content;
                                        break;
                                    }
                                }
                            }

                            return (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "flex gap-3 animate-fade-in",
                                        isUser ? "flex-row-reverse" : "flex-row"
                                    )}
                                >
                                    {/* Avatar */}
                                    <div
                                        className={cn(
                                            "h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-sm",
                                            isUser
                                                ? "bg-blue-600 text-white"
                                                : msg.error
                                                ? "bg-red-100 text-red-500"
                                                : "bg-gradient-to-br from-purple-600 to-indigo-600 text-white"
                                        )}
                                    >
                                        {isUser ? (
                                            <User className="h-4 w-4" />
                                        ) : msg.error ? (
                                            <AlertCircle className="h-4 w-4" />
                                        ) : (
                                            <Brain className="h-4 w-4" />
                                        )}
                                    </div>

                                    {/* Message Body & Actions */}
                                    <div
                                        className={cn(
                                            "max-w-[80%] md:max-w-[75%] space-y-2 group/msg",
                                            isUser ? "items-end" : "items-start"
                                        )}
                                    >
                                        {/* Card Content / Gemini-Style Prompt Editor */}
                                        {isUser && editingMsgId === msg.id ? (
                                            <div className="w-full min-w-[280px] sm:min-w-[420px] bg-slate-100/90 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 animate-fade-in text-left">
                                                <textarea
                                                    value={editText}
                                                    onChange={(e) => setEditText(e.target.value)}
                                                    rows={Math.max(2, editText.split("\n").length)}
                                                    placeholder="Edit prompt..."
                                                    className="w-full bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none text-sm sm:text-base leading-relaxed border-none ring-0 outline-none resize-none"
                                                    autoFocus
                                                />
                                                <div className="flex items-center justify-end gap-3 pt-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingMsgId(null)}
                                                        className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSaveEditedPrompt(msg.id)}
                                                        disabled={!editText.trim()}
                                                        className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs rounded-full shadow-sm active:scale-95 transition"
                                                    >
                                                        Update
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                className={cn(
                                                    "rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm relative",
                                                    isUser
                                                        ? "bg-blue-600 text-white rounded-tr-sm"
                                                        : msg.error
                                                        ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800/50 rounded-tl-sm"
                                                        : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-sm"
                                                )}
                                            >
                                                <FormattedMessageContent
                                                    content={msg.content}
                                                    onAskQuestion={!isUser ? (q) => send(q) : undefined}
                                                />
                                            </div>
                                        )}

                                        {/* Action Toolbar (Gemini Style) */}
                                        <div
                                            className={cn(
                                                "flex items-center gap-1 text-xs opacity-90 transition-opacity pt-0.5 px-1",
                                                isUser ? "justify-end" : "justify-start"
                                            )}
                                        >
                                            {/* USER ACTIONS: Copy Prompt, Edit Prompt */}
                                            {isUser && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyText(msg.id, msg.content)}
                                                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                                                        title="Copy prompt"
                                                    >
                                                        {copiedMsgId === msg.id ? (
                                                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                                                        ) : (
                                                            <Copy className="h-3.5 w-3.5" />
                                                        )}
                                                        <span>{copiedMsgId === msg.id ? "Copied" : "Copy"}</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleStartEditPrompt(msg)}
                                                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                                                        title="Edit prompt"
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                        <span>Edit</span>
                                                    </button>
                                                </>
                                            )}

                                            {/* ASSISTANT ACTIONS: Copy Response, Redo, Save/Bookmark, Read Aloud */}
                                            {!isUser && !msg.error && msg.id !== "welcome" && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyText(msg.id, msg.content)}
                                                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                                                        title="Copy response"
                                                    >
                                                        {copiedMsgId === msg.id ? (
                                                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                                                        ) : (
                                                            <Copy className="h-3.5 w-3.5" />
                                                        )}
                                                        <span>{copiedMsgId === msg.id ? "Copied" : "Copy"}</span>
                                                    </button>

                                                    {prevUserPrompt && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRedo(msg.id, prevUserPrompt)}
                                                            disabled={loading}
                                                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition disabled:opacity-50"
                                                            title="Redo / Regenerate response"
                                                        >
                                                            <RotateCcw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                                                            <span>Redo</span>
                                                        </button>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() => handleSaveMessageToggle(msg.id)}
                                                        className={cn(
                                                            "flex items-center gap-1 px-2 py-1 rounded-lg transition",
                                                            msg.is_saved
                                                                ? "text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40"
                                                                : "text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                                                        )}
                                                        title={msg.is_saved ? "Unsave Response" : "Save Response"}
                                                    >
                                                        {msg.is_saved ? (
                                                            <BookmarkCheck className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                                        ) : (
                                                            <Bookmark className="h-3.5 w-3.5" />
                                                        )}
                                                        <span>{msg.is_saved ? "Saved" : "Save"}</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (isSpeakingTTS) stopTTS();
                                                            else speakAnswer(msg.content);
                                                        }}
                                                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                                                        title={isSpeakingTTS ? "Stop Speaking" : "Read Aloud"}
                                                    >
                                                        {isSpeakingTTS ? (
                                                            <VolumeX className="h-3.5 w-3.5 text-red-500 animate-pulse" />
                                                        ) : (
                                                            <Volume2 className="h-3.5 w-3.5" />
                                                        )}
                                                        <span>{isSpeakingTTS ? "Stop" : "Listen"}</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        {/* Source Excerpts */}
                                        {msg.excerpts && msg.excerpts.length > 0 && (
                                            <div className="space-y-2 pt-1">
                                                <button
                                                    onClick={() => toggleExcerpts(msg.id)}
                                                    className="text-xs font-bold text-slate-500 flex items-center gap-1.5 p-1.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors border border-transparent"
                                                >
                                                    <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                                        <BookOpen className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                                                    </div>
                                                    Source Excerpts ({msg.excerpts.length})
                                                    <ChevronDown
                                                        className={cn(
                                                            "h-3.5 w-3.5 transition-transform duration-200 text-slate-400",
                                                            expandedExcerpts[String(msg.id)] ? "rotate-180" : ""
                                                        )}
                                                    />
                                                </button>

                                                {expandedExcerpts[String(msg.id)] && (
                                                    <div className="space-y-2 animate-fade-in origin-top">
                                                        {msg.excerpts.map((excerpt, i) => (
                                                            <div
                                                                key={i}
                                                                className="bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100/50 dark:border-purple-800/30 rounded-xl px-4 py-3 text-xs text-purple-800 dark:text-purple-300 leading-relaxed space-y-1"
                                                            >
                                                                {excerpt.book_title && (
                                                                    <div className="flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider opacity-70 mb-1 text-purple-900 dark:text-purple-200">
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
                            );
                        })}

                        {isOnlyWelcome && (
                            <div className="pt-2 pb-2 animate-fade-in space-y-3">
                                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
                                    Suggested Starter Questions
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {SUGGESTED_PROMPTS.map((item, idx) => {
                                        const IconComponent = item.icon;
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => send(item.prompt)}
                                                className="text-left p-4 bg-white dark:bg-slate-800/80 hover:bg-purple-50/70 dark:hover:bg-purple-950/40 border border-slate-200/80 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-700 rounded-2xl shadow-sm hover:shadow transition-all group"
                                            >
                                                <div className="flex items-center gap-2.5 mb-1.5">
                                                    <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-xl text-purple-600 dark:text-purple-300 group-hover:scale-110 transition-transform">
                                                        <IconComponent className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                                        {item.title}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                                    {item.subtitle}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {loading && (
                            <div className="flex gap-3 animate-fade-in">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                                    <Brain className="h-4 w-4" />
                                </div>
                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-5 py-3.5 shadow-sm flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 text-purple-600 animate-spin" />
                                    <span className="text-sm text-slate-500 dark:text-slate-400">Thinking…</span>
                                </div>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* Bottom Prompt Input Area */}
                    <div className="shrink-0 p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        {voiceNotice && (
                            <div className="max-w-4xl mx-auto mb-3 p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2 animate-fade-in shadow-sm">
                                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <span>{voiceNotice}</span>
                            </div>
                        )}
                        <div className="relative group/input max-w-4xl mx-auto">
                            <div className="absolute -inset-[2px] rounded-[22px] bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 opacity-0 group-focus-within/input:opacity-60 blur-sm transition-opacity duration-500 -z-10" />

                            <div
                                className={cn(
                                    "relative flex items-end gap-3 bg-white dark:bg-slate-800 rounded-2xl px-5 py-3.5 border border-slate-200 dark:border-slate-700",
                                    "shadow-sm focus-within:shadow-md transition-all duration-300"
                                )}
                            >
                                <textarea
                                    id="qa-input"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={
                                        isListening
                                            ? "Listening to your voice..."
                                            : "Ask a question about your library books…"
                                    }
                                    rows={1}
                                    className="relative flex-1 resize-none bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none border-none outline-none focus:ring-0 leading-relaxed z-10"
                                />

                                {/* Stop TTS Button */}
                                {isSpeakingTTS && (
                                    <button
                                        type="button"
                                        id="qa-stop-tts-btn"
                                        aria-label="Stop TTS Voice"
                                        onClick={stopTTS}
                                        className={cn(
                                            "relative h-10 px-3 rounded-xl shrink-0 z-10 flex items-center gap-1.5 text-xs font-bold transition-all duration-200 animate-fade-in",
                                            "bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 hover:from-pink-500 hover:to-red-500 text-white shadow-sm"
                                        )}
                                        title="Stop Voice Output"
                                    >
                                        <VolumeX className="h-4 w-4 text-white animate-pulse" />
                                        <span className="hidden sm:inline">Stop</span>
                                    </button>
                                )}

                                {/* Voice Mic Button */}
                                <div className="relative shrink-0">
                                    {transcribingVoice && (
                                        <div className="absolute -top-11 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-800/80 px-3.5 py-1.5 rounded-full shadow-xl animate-fade-in whitespace-nowrap">
                                            <Loader2 className="h-3.5 w-3.5 text-purple-600 animate-spin" />
                                            Transcribing audio (Whisper AI)…
                                        </div>
                                    )}
                                    {isListening && !transcribingVoice && (
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
                                                : "bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-sm"
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

                                {/* Send Button */}
                                <Button
                                    id="qa-send-btn"
                                    aria-label="Send"
                                    onClick={() => send()}
                                    disabled={loading || !input.trim()}
                                    size="icon"
                                    className={cn(
                                        "relative h-10 w-10 rounded-xl shrink-0 z-10",
                                        "bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-sm",
                                        "disabled:opacity-50 disabled:shadow-none"
                                    )}
                                >
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                                    ) : (
                                        <Send className="h-4 w-4 text-white" />
                                    )}
                                </Button>
                            </div>
                        </div>
                        <p className="text-center text-[11px] text-slate-400 mt-2">
                            Press Enter to send · Shift+Enter for new line
                        </p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
