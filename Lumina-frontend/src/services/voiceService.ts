import apiClient from "./apiClient";

export interface KokoroVoice {
    code: string;
    name: string;
    language: string;
    gender: string;
    quality: string;
}

export interface VoicePreferences {
    voice: string;
    speed: number;
    language: string;
    auto_play: boolean;
    show_transcript: boolean;
}

export interface VoiceTurn {
    id: number;
    conversation_id: number;
    turn_number: number;
    speaker: "user" | "assistant";
    text: string;
    audio_url?: string;
    intent?: string;
    action_taken?: Record<string, any>;
    latency_ms?: number;
    created_at?: string;
}

export interface VoiceConversation {
    id: number;
    session_id: string;
    user_id: number;
    book_id?: number;
    started_at: string;
    ended_at?: string;
    status: string;
    metadata_json?: Record<string, any>;
    turns: VoiceTurn[];
}

let currentAudioInstance: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let speechKeepAliveTimer: any = null;

export const voiceService = {
    async getVoices(): Promise<KokoroVoice[]> {
        const res = await apiClient.get<KokoroVoice[]>("/voice/voices");
        return res.data;
    },

    async getPreferences(): Promise<VoicePreferences> {
        const res = await apiClient.get<VoicePreferences>("/voice/preferences");
        return res.data;
    },

    async updatePreferences(prefs: Partial<VoicePreferences>): Promise<VoicePreferences> {
        const res = await apiClient.put<VoicePreferences>("/voice/preferences", prefs);
        return res.data;
    },

    async getConversations(): Promise<VoiceConversation[]> {
        const res = await apiClient.get<VoiceConversation[]>("/voice/conversations");
        return res.data;
    },

    async deleteConversation(id: number): Promise<void> {
        await apiClient.delete(`/voice/conversations/${id}`);
    },

    stopCurrentSpeech(): void {
        if (speechKeepAliveTimer) {
            clearInterval(speechKeepAliveTimer);
            speechKeepAliveTimer = null;
        }
        if (currentAudioInstance) {
            try {
                currentAudioInstance.pause();
                currentAudioInstance.currentTime = 0;
            } catch (e) {}
            currentAudioInstance = null;
        }
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            try {
                window.speechSynthesis.cancel();
            } catch (e) {}
        }
        currentUtterance = null;
    },

    async speakText(
        text: string,
        options?: {
            voice?: string;
            speed?: number;
            onStart?: () => void;
            onEnd?: () => void;
            onError?: (err: any) => void;
        }
    ): Promise<void> {
        this.stopCurrentSpeech();
        const cleanText = text ? text.trim() : "";
        if (!cleanText) {
            options?.onEnd?.();
            return;
        }

        const isIndic = /[\u0900-\u097F\u1CD0-\u1CFF\uA8E0-\uA8FF]/.test(cleanText);
        const voice = options?.voice || (isIndic ? "hindi_natural" : "af_bella");
        const speed = options?.speed || 1.0;

        let hasFallenBack = false;
        const triggerFallback = () => {
            if (hasFallenBack) return;
            hasFallenBack = true;
            this.fallbackSpeechSynthesis(cleanText, options);
        };

        // For Indic (Hindi / Sanskrit) or general text, stream authentic pronunciation from backend voice service
        try {
            const res = await apiClient.post(
                "/voice/tts",
                { text: cleanText, voice, speed },
                { responseType: "blob", timeout: 25000 }
            );

            const blob: Blob = res.data;
            if (!blob || blob.size === 0) {
                throw new Error("Empty audio response from TTS service");
            }

            // Check if backend returned an error envelope formatted as JSON inside blob
            if (blob.type && blob.type.includes("application/json")) {
                const textErr = await blob.text();
                throw new Error(`TTS service returned error: ${textErr}`);
            }

            const contentType = res.headers?.["content-type"] || blob.type || (isIndic ? "audio/mpeg" : "audio/wav");
            const audioBlob = new Blob([blob], { type: contentType });
            const url = URL.createObjectURL(audioBlob);
            const audio = new Audio(url);
            currentAudioInstance = audio;

            audio.onplay = () => {
                options?.onStart?.();
            };
            audio.onended = () => {
                if (currentAudioInstance === audio) {
                    currentAudioInstance = null;
                }
                URL.revokeObjectURL(url);
                options?.onEnd?.();
            };
            audio.onerror = (e) => {
                if (currentAudioInstance === audio) {
                    currentAudioInstance = null;
                }
                URL.revokeObjectURL(url);
                console.warn("Audio element playback error, falling back to Web Speech:", e);
                triggerFallback();
            };

            await audio.play().catch((playErr) => {
                if (currentAudioInstance === audio) {
                    currentAudioInstance = null;
                }
                URL.revokeObjectURL(url);
                console.warn("audio.play() rejected, falling back to Web Speech:", playErr);
                triggerFallback();
            });
            return;
        } catch (backendErr) {
            console.warn("Backend TTS failed, using browser SpeechSynthesis fallback:", backendErr);
            triggerFallback();
        }
    },

    fallbackSpeechSynthesis(
        text: string,
        options?: {
            voice?: string;
            speed?: number;
            onStart?: () => void;
            onEnd?: () => void;
            onError?: (err: any) => void;
        }
    ): void {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
            options?.onError?.(new Error("Speech synthesis not supported"));
            options?.onEnd?.();
            return;
        }

        try {
            window.speechSynthesis.cancel();
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }

            const utterance = new SpeechSynthesisUtterance(text);
            currentUtterance = utterance; // Prevent V8 garbage collection mid-speech
            utterance.rate = options?.speed || 1.0;

            const isIndic = /[\u0900-\u097F\u1CD0-\u1CFF\uA8E0-\uA8FF]/.test(text);
            if (isIndic) {
                utterance.lang = "hi-IN";
            } else {
                utterance.lang = "en-US";
            }

            const selectVoice = () => {
                const availableVoices = window.speechSynthesis.getVoices();
                if (!availableVoices || availableVoices.length === 0) return;

                if (isIndic) {
                    const hindiVoice = availableVoices.find(v =>
                        v.lang.startsWith("hi") ||
                        v.lang.startsWith("sa") ||
                        v.name.toLowerCase().includes("hindi") ||
                        v.name.toLowerCase().includes("india") ||
                        v.name.toLowerCase().includes("swara") ||
                        v.name.toLowerCase().includes("hemant") ||
                        v.name.toLowerCase().includes("kalpana")
                    );
                    if (hindiVoice) utterance.voice = hindiVoice;
                } else if (options?.voice) {
                    const isFemale = options.voice.startsWith("af_") || options.voice.startsWith("bf_") || options.voice.includes("female");
                    const matched = availableVoices.find(v => {
                        const name = v.name.toLowerCase();
                        return isFemale
                            ? (name.includes("female") || name.includes("zira") || name.includes("samantha") || name.includes("victoria") || name.includes("jenny"))
                            : (name.includes("male") || name.includes("david") || name.includes("alex") || name.includes("george") || name.includes("guy"));
                    });
                    if (matched) utterance.voice = matched;
                }
            };

            selectVoice();
            if (window.speechSynthesis.onvoiceschanged !== undefined && window.speechSynthesis.getVoices().length === 0) {
                window.speechSynthesis.onvoiceschanged = () => {
                    selectVoice();
                };
            }

            // Keep-alive timer to prevent Chrome's 15-second speech synthesis pause bug
            if (speechKeepAliveTimer) {
                clearInterval(speechKeepAliveTimer);
            }
            speechKeepAliveTimer = setInterval(() => {
                if (typeof window !== "undefined" && "speechSynthesis" in window) {
                    if (window.speechSynthesis.speaking) {
                        window.speechSynthesis.pause();
                        window.speechSynthesis.resume();
                    } else {
                        clearInterval(speechKeepAliveTimer);
                        speechKeepAliveTimer = null;
                    }
                }
            }, 8000);

            utterance.onstart = () => {
                options?.onStart?.();
            };
            utterance.onend = () => {
                if (speechKeepAliveTimer) {
                    clearInterval(speechKeepAliveTimer);
                    speechKeepAliveTimer = null;
                }
                currentUtterance = null;
                options?.onEnd?.();
            };
            utterance.onerror = (e) => {
                if (speechKeepAliveTimer) {
                    clearInterval(speechKeepAliveTimer);
                    speechKeepAliveTimer = null;
                }
                currentUtterance = null;
                if (e.error !== "interrupted" && e.error !== "canceled") {
                    options?.onError?.(e);
                }
                options?.onEnd?.();
            };

            window.speechSynthesis.speak(utterance);
        } catch (e) {
            if (speechKeepAliveTimer) {
                clearInterval(speechKeepAliveTimer);
                speechKeepAliveTimer = null;
            }
            currentUtterance = null;
            options?.onError?.(e);
            options?.onEnd?.();
        }
    },

    async playVoiceSample(voice: string, speed: number = 1.0, text?: string): Promise<void> {
        const cleanVoiceName = voice.replace(/^[ab][fm]_/, "").replace(/_/g, " ");
        const sampleText = text || `Hello! This is a test of the ${cleanVoiceName} voice model in LuminaLib.`;

        await this.speakText(sampleText, { voice, speed });
    },

    async transcribeAudio(audioBlob: Blob): Promise<string> {
        try {
            const formData = new FormData();
            formData.append("file", audioBlob, "speech.webm");
            const res = await apiClient.post<{ transcript: string }>("/voice/transcribe", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            return res.data?.transcript || "";
        } catch (err) {
            console.error("Transcription request failed:", err);
            return "";
        }
    },
};

export default voiceService;
