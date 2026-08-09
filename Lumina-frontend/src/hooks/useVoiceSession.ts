import { useCallback, useEffect, useRef, useState } from "react";

export interface MessageTurn {
    id: string;
    speaker: "user" | "assistant";
    text: string;
    intent?: string;
    actionResult?: any;
    timestamp: Date;
}

export interface PendingAction {
    action_id: string;
    action: string;
    book_id?: string;
    book_title?: string;
    message: string;
}

export function useVoiceSession(bookId?: string | number) {
    const [isConnected, setIsConnected] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [messages, setMessages] = useState<MessageTurn[]>([]);
    const [currentTranscript, setCurrentTranscript] = useState("");
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const activeStreamRef = useRef<MediaStream | null>(null);

    const wsUrl = process.env.NEXT_PUBLIC_VOICE_WS_URL || "ws://localhost:8001/voice/ws";

    // Play binary WAV/Audio chunks from WebSocket
    const audioChunksRef = useRef<Blob[]>([]);

    const playAudioChunk = useCallback(async (arrayBuffer: ArrayBuffer) => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }

            const ctx = audioContextRef.current;
            if (ctx.state === "suspended") {
                await ctx.resume();
            }

            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;

            if (!analyserRef.current) {
                analyserRef.current = ctx.createAnalyser();
                analyserRef.current.fftSize = 64;
            }

            source.connect(analyserRef.current);
            analyserRef.current.connect(ctx.destination);

            setIsSpeaking(true);
            source.start(0);

            source.onended = () => {
                setIsSpeaking(false);
            };
        } catch (err) {
            console.error("Audio playback error:", err);
            setIsSpeaking(false);
        }
    }, []);

    const connect = useCallback(() => {
        if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
            return;
        }

        const bId = bookId ? String(bookId) : "general";
        const url = `${wsUrl.replace(/\/$/, "")}/${bId}`;
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const protocols = token ? ["voice-v1", `jwt-${token}`] : ["voice-v1"];

        try {
            const ws = new WebSocket(url, protocols);
            ws.binaryType = "arraybuffer";

            ws.onopen = () => {
                setIsConnected(true);
                console.log("Connected to Lumina Voice Service");
            };

            ws.onmessage = (event) => {
                if (typeof event.data === "string") {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === "transcript") {
                            setCurrentTranscript(data.text);
                            if (data.is_final && data.text) {
                                setMessages((prev) => {
                                    const last = prev[prev.length - 1];
                                    if (last && last.speaker === "user" && last.text === data.text) {
                                        return prev;
                                    }
                                    return [
                                        ...prev,
                                        {
                                            id: `u_${Date.now()}`,
                                            speaker: "user",
                                            text: data.text,
                                            timestamp: new Date(),
                                        },
                                    ];
                                });
                                setCurrentTranscript("");
                            }
                        } else if (data.type === "response_text") {
                            setMessages((prev) => [
                                ...prev,
                                {
                                    id: `a_${Date.now()}`,
                                    speaker: "assistant",
                                    text: data.text,
                                    timestamp: new Date(),
                                },
                            ]);
                        } else if (data.type === "action_request") {
                            setPendingAction({
                                action_id: data.action_id,
                                action: data.action,
                                book_id: data.book_id,
                                book_title: data.book_title,
                                message: data.message,
                            });
                        } else if (data.type === "action_result") {
                            setPendingAction(null);
                        }
                    } catch (e) {
                        console.error("Failed to parse WS JSON event", e);
                    }
                } else if (event.data instanceof ArrayBuffer) {
                    playAudioChunk(event.data);
                }
            };

            ws.onclose = () => {
                setIsConnected(false);
                setIsListening(false);
                setIsSpeaking(false);
            };

            ws.onerror = (err) => {
                console.error("Voice WebSocket error", err);
            };

            wsRef.current = ws;
        } catch (e) {
            console.error("Failed to initialize Voice WebSocket", e);
        }
    }, [bookId, wsUrl, playAudioChunk]);

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        if (activeStreamRef.current) {
            activeStreamRef.current.getTracks().forEach((track) => track.stop());
            activeStreamRef.current = null;
        }
        setIsConnected(false);
        setIsListening(false);
        setIsSpeaking(false);
    }, []);

    const startListening = useCallback(async () => {
        if (!isConnected) {
            connect();
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            activeStreamRef.current = stream;

            let mimeType = "audio/webm";
            if (!MediaRecorder.isTypeSupported("audio/webm")) {
                if (MediaRecorder.isTypeSupported("audio/mp4")) {
                    mimeType = "audio/mp4";
                } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
                    mimeType = "audio/ogg";
                }
            }

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                if (audioChunksRef.current.length > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
                    const completeBlob = new Blob(audioChunksRef.current, { type: mimeType });
                    audioChunksRef.current = [];
                    const buffer = await completeBlob.arrayBuffer();
                    wsRef.current.send(buffer);
                }
            };

            mediaRecorder.start(250);
            setIsListening(true);
        } catch (err) {
            console.error("Microphone access error:", err);
            setIsListening(false);
        }
    }, [isConnected, connect]);

    const stopListening = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        if (activeStreamRef.current) {
            activeStreamRef.current.getTracks().forEach((track) => track.stop());
            activeStreamRef.current = null;
        }
        setIsListening(false);
    }, []);

    const sendTextMessage = useCallback(
        (text: string) => {
            const trimmed = text.trim();
            if (!trimmed) return;

            setMessages((prev) => [
                ...prev,
                {
                    id: `u_${Date.now()}`,
                    speaker: "user",
                    text: trimmed,
                    timestamp: new Date(),
                },
            ]);

            const sendPayload = () => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({ type: "text", content: trimmed }));
                }
            };

            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                connect();
                setTimeout(sendPayload, 500);
            } else {
                sendPayload();
            }
        },
        [connect]
    );

    const confirmAction = useCallback((actionId: string, confirmed: boolean) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
                JSON.stringify({
                    type: "confirm",
                    action_id: actionId,
                    confirmed,
                })
            );
        }
        setPendingAction(null);
    }, []);

    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        isConnected,
        isListening,
        isSpeaking,
        messages,
        currentTranscript,
        pendingAction,
        connect,
        disconnect,
        startListening,
        stopListening,
        sendTextMessage,
        confirmAction,
        analyserNode: analyserRef.current,
    };
}
