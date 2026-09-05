"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
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
            <DashboardLayout>
                <div className="flex justify-center items-center min-h-[400px]">
                    <RefreshCw className="h-8 w-8 text-purple-500 animate-spin" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30">
                            <Settings className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Voice Assistant Settings</h1>
                            <p className="text-sm text-slate-500 dark:text-gray-400">Configure Kokoro TTS voices, speech rates, and audio controls</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => handleTestSample(prefs.voice)}
                        disabled={!!testingVoice}
                        className="px-4 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/80 dark:hover:bg-purple-900 border border-purple-300 dark:border-purple-500/40 text-purple-700 dark:text-purple-200 text-sm font-semibold rounded-xl transition-all flex items-center gap-2"
                    >
                        {testingVoice === prefs.voice ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                        <span>Test Active Voice</span>
                    </button>
                </div>

                {successMessage && (
                    <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 rounded-xl flex items-center gap-2 text-sm">
                        <Check className="h-5 w-5" />
                        <span>{successMessage}</span>
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-6">
                    {/* Voice Selection */}
                    <div className="bg-white dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800 rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <span>Select Voice</span>
                            <span className="text-xs bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 px-2 py-0.5 rounded-full">
                                {voices.length} Available
                            </span>
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {voices.map((v) => {
                                const isSelected = prefs.voice === v.code;
                                return (
                                    <div
                                        key={v.code}
                                        onClick={() => setPrefs({ ...prefs, voice: v.code })}
                                        className={`cursor-pointer p-4 rounded-xl border transition-all flex flex-col justify-between ${
                                            isSelected
                                                ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-900 dark:text-white ring-1 ring-purple-500"
                                                : "bg-slate-50/50 dark:bg-gray-900/30 border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-300 hover:border-slate-300 dark:hover:border-gray-700"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="font-semibold text-sm">{v.name}</div>
                                                <div className="text-xs text-slate-500 dark:text-gray-400 capitalize">
                                                    {v.gender} • {v.language}
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <span className="p-1 bg-purple-600 rounded-full text-white">
                                                    <Check className="h-3 w-3" />
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-3 flex justify-between items-center text-xs text-slate-500 dark:text-gray-500">
                                            <span>Quality: {v.quality}</span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleTestSample(v.code);
                                                }}
                                                className="p-1.5 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-lg text-purple-600 dark:text-purple-300 transition-colors"
                                                title="Preview voice"
                                            >
                                                {testingVoice === v.code ? (
                                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Volume2 className="h-3.5 w-3.5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Speed / Controls */}
                    <div className="bg-white dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800 rounded-2xl p-6 space-y-6">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-sm font-semibold text-slate-900 dark:text-white">Speech Speed: {prefs.speed}x</label>
                                <span className="text-xs text-slate-500 dark:text-gray-400">Normal is 1.0x</span>
                            </div>
                            <input
                                type="range"
                                min="0.5"
                                max="2.0"
                                step="0.1"
                                value={prefs.speed}
                                onChange={(e) => setPrefs({ ...prefs, speed: parseFloat(e.target.value) })}
                                className="w-full h-2 bg-slate-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                            <div className="flex justify-between text-xs text-slate-400 dark:text-gray-500 mt-1">
                                <span>0.5x (Slow)</span>
                                <span>1.0x</span>
                                <span>2.0x (Fast)</span>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 dark:border-gray-800/80 pt-6">
                            <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">Auto-Play Voice for Responses</div>
                                    <div className="text-xs text-slate-500 dark:text-gray-400">
                                        Automatically read out LLM answers as speech when completed
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={prefs.auto_play}
                                    onChange={(e) => setPrefs({ ...prefs, auto_play: e.target.checked })}
                                    className="h-5 w-5 text-purple-600 rounded border-slate-300 dark:border-gray-700 focus:ring-purple-500"
                                />
                            </label>
                        </div>

                        <div className="border-t border-slate-100 dark:border-gray-800/80 pt-6">
                            <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">Show Live Transcript Banner</div>
                                    <div className="text-xs text-slate-500 dark:text-gray-400">
                                        Display speech captions while listening and generating audio
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={prefs.show_transcript}
                                    onChange={(e) => setPrefs({ ...prefs, show_transcript: e.target.checked })}
                                    className="h-5 w-5 text-purple-600 rounded border-slate-300 dark:border-gray-700 focus:ring-purple-500"
                                />
                            </label>
                        </div>
                    </div>

                    {/* Submit button */}
                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => handleTestSample(prefs.voice)}
                            disabled={!!testingVoice}
                            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-200 font-medium rounded-xl transition-all flex items-center gap-2"
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
        </DashboardLayout>
    );
}
