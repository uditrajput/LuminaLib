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

    async playVoiceSample(voice: string, speed: number = 1.0, text?: string): Promise<void> {
        const cleanVoiceName = voice.replace(/^[ab][fm]_/, "").replace(/_/g, " ");
        const sampleText = text || `Hello! This is a test of the ${cleanVoiceName} voice model in LuminaLib.`;

        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            try {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(sampleText);
                utterance.rate = speed;

                const availableVoices = window.speechSynthesis.getVoices();
                if (availableVoices.length > 0) {
                    const isFemale = voice.startsWith("af_") || voice.startsWith("bf_");
                    const matched = availableVoices.find(v => {
                        const name = v.name.toLowerCase();
                        return isFemale
                            ? (name.includes("female") || name.includes("zira") || name.includes("samantha") || name.includes("victoria"))
                            : (name.includes("male") || name.includes("david") || name.includes("alex") || name.includes("george"));
                    });
                    if (matched) {
                        utterance.voice = matched;
                    }
                }

                window.speechSynthesis.speak(utterance);
                return;
            } catch (err) {
                console.warn("Web Speech API playback failed, using backend sample endpoint:", err);
            }
        }

        try {
            const res = await apiClient.get("/voice/sample", {
                params: { voice, speed, text: sampleText },
                responseType: "blob",
            });
            const blob = new Blob([res.data], { type: "audio/wav" });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            await audio.play();
        } catch (err) {
            console.error("Backend voice sample failed:", err);
        }
    },
};

export default voiceService;
