"use client";

import React, { useEffect, useState } from "react";
import voiceService, { KokoroVoice, VoicePreferences } from "@/services/voiceService";
import { Volume2, Settings, Check, RefreshCw } from "lucide-react";

export default function VoiceSettingsPage() {
    const [voices, setVoices] = useState<KokoroVoice[]>([]);
    const [prefs, setPrefs] = useState<VoicePreferences>({
        voice: "af_bella",
        speed: 1.0,
        language: "a",
        auto_play: true,
        show_transcript: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        const loadData = async () => {
            try {
                const [vList, pData] = await Promise.all([
                    voiceService.getVoices(),
                    voiceService.getPreferences(),
                ]);
                setVoices(vList);
                if (pData) setPrefs(pData);
            } catch (err) {
                console.error("Failed to load voice preferences:", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const [testingVoice, setTestingVoice] = useState<string | null>(null);

    const handleTestSample = async (voiceCode: string) => {
        setTestingVoice(voiceCode);
        try {
            await voiceService.playVoiceSample(voiceCode, prefs.speed);
        } catch (err) {
            console.error("Failed to test voice sample:", err);
        } finally {
            setTestingVoice(null);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSuccessMessage("");
        try {
            const updated = await voiceService.updatePreferences(prefs);
            setPrefs(updated);
            setSuccessMessage("Voice preferences saved successfully!");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err) {
            console.error("Failed to save voice preferences:", err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <RefreshCw className="h-8 w-8 text-purple-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30">
                        <Settings className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Voice Assistant Settings</h1>
                        <p className="text-sm text-gray-400">Configure Kokoro TTS voices, speech rates, and audio controls</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => handleTestSample(prefs.voice)}
                    disabled={!!testingVoice}
                    className="px-4 py-2 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200 text-sm font-semibold rounded-xl transition-all flex items-center gap-2"
                >
                    {testingVoice === prefs.voice ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                    <span>Test Active Voice</span>
                </button>
            </div>

            {successMessage && (
                <div className="mb-6 p-4 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-xl flex items-center gap-2 text-sm">
                    <Check className="h-5 w-5" />
                    <span>{successMessage}</span>
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-6 bg-gray-900/60 border border-gray-800 rounded-2xl p-6 backdrop-blur-md">
                {/* Voice Model Pack Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Kokoro TTS Voice Pack</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {voices.map((v) => (
                            <div
                                key={v.code}
                                onClick={() => setPrefs({ ...prefs, voice: v.code })}
                                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                                    prefs.voice === v.code
                                        ? "bg-purple-950/60 border-purple-500 text-white ring-2 ring-purple-500/50"
                                        : "bg-gray-800/60 border-gray-700 text-gray-300 hover:bg-gray-800"
                                }`}
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <Volume2 className={`h-5 w-5 shrink-0 ${prefs.voice === v.code ? "text-purple-400" : "text-gray-500"}`} />
                                    <div className="truncate">
                                        <div className="font-semibold text-sm truncate">{v.name}</div>
                                        <div className="text-xs text-gray-400">{v.language} • {v.gender}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleTestSample(v.code); }}
                                        title={`Listen sample for ${v.name}`}
                                        className="p-1.5 rounded-lg hover:bg-purple-900/60 text-purple-300 transition-colors"
                                    >
                                        {testingVoice === v.code ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                                    </button>
                                    <span className="text-xs px-2 py-0.5 rounded bg-gray-700/80 text-gray-300 font-mono">{v.quality}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Speech Speed Slider */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-200">Speech Rate (Speed)</label>
                        <span className="text-xs font-mono px-2.5 py-1 bg-purple-950 text-purple-300 rounded-lg border border-purple-500/30">
                            {prefs.speed}x
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={prefs.speed}
                        onChange={(e) => setPrefs({ ...prefs, speed: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                        <span>0.5x (Slower)</span>
                        <span>1.0x (Normal)</span>
                        <span>2.0x (Faster)</span>
                    </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-800">
                    <label className="flex items-center justify-between p-4 bg-gray-800/40 rounded-xl border border-gray-700/60 cursor-pointer">
                        <div>
                            <div className="text-sm font-medium text-gray-200">Auto-play TTS Audio</div>
                            <div className="text-xs text-gray-400">Automatically stream & play voice responses</div>
                        </div>
                        <input
                            type="checkbox"
                            checked={prefs.auto_play}
                            onChange={(e) => setPrefs({ ...prefs, auto_play: e.target.checked })}
                            className="h-5 w-5 text-purple-600 rounded border-gray-700 focus:ring-purple-500"
                        />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-gray-800/40 rounded-xl border border-gray-700/60 cursor-pointer">
                        <div>
                            <div className="text-sm font-medium text-gray-200">Show Real-time Transcript</div>
                            <div className="text-xs text-gray-400">Display live text bubbles in voice drawer</div>
                        </div>
                        <input
                            type="checkbox"
                            checked={prefs.show_transcript}
                            onChange={(e) => setPrefs({ ...prefs, show_transcript: e.target.checked })}
                            className="h-5 w-5 text-purple-600 rounded border-gray-700 focus:ring-purple-500"
                        />
                    </label>
                </div>

                {/* Submit button */}
                <div className="pt-4 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => handleTestSample(prefs.voice)}
                        disabled={!!testingVoice}
                        className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 font-medium rounded-xl transition-all flex items-center gap-2"
                    >
                        {testingVoice === prefs.voice ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                        <span>Listen Sample</span>
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
                        <span>Save Voice Settings</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
