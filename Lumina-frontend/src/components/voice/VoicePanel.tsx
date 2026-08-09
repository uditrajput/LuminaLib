import React, { useState } from "react";
import { useVoiceSession } from "@/hooks/useVoiceSession";
import AudioVisualizer from "./AudioVisualizer";
import TranscriptBubble from "./TranscriptBubble";
import ActionConfirmation from "./ActionConfirmation";
import { Mic, MicOff, Send, X, Volume2, Sparkles, BookOpen } from "lucide-react";

interface VoicePanelProps {
    isOpen: boolean;
    onClose: () => void;
    bookId?: string | number;
    bookTitle?: string;
}

export const VoicePanel: React.FC<VoicePanelProps> = ({
    isOpen,
    onClose,
    bookId,
    bookTitle,
}) => {
    const {
        isConnected,
        isListening,
        isSpeaking,
        messages,
        currentTranscript,
        pendingAction,
        connect,
        startListening,
        stopListening,
        sendTextMessage,
        confirmAction,
        analyserNode,
    } = useVoiceSession(bookId);

    const [textInput, setTextInput] = useState("");

    if (!isOpen) return null;

    const handleSendText = (e: React.FormEvent) => {
        e.preventDefault();
        if (textInput.trim()) {
            sendTextMessage(textInput);
            setTextInput("");
        }
    };

    return (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-gray-950/95 border-l border-gray-800 shadow-2xl flex flex-col backdrop-blur-xl transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/60">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-lg text-white">
                        <Sparkles className="h-5 w-5 animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-white">Lumina Voice Assistant</h3>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                            {bookTitle ? (
                                <>
                                    <BookOpen className="h-3 w-3 text-purple-400" />
                                    <span className="truncate max-w-[200px]">{bookTitle}</span>
                                </>
                            ) : (
                                "Global Catalog Context"
                            )}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Audio Waveform & Status */}
            <div className="p-4 bg-gray-900/40 border-b border-gray-800 flex flex-col items-center">
                <AudioVisualizer isListening={isListening} isSpeaking={isSpeaking} analyserNode={analyserNode} />
                <div className="flex items-center gap-2 text-xs text-gray-300 mt-1">
                    <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-gray-500"}`} />
                    {isListening
                        ? "Listening... speak clearly"
                        : isSpeaking
                        ? "Speaking..."
                        : isConnected
                        ? "Connected & Ready"
                        : "Disconnected"}
                </div>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && !currentTranscript && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-6">
                        <Volume2 className="h-12 w-12 text-purple-500/40 mb-3" />
                        <p className="text-sm font-medium text-gray-300 mb-1">Hold Mic or Type to Speak</p>
                        <p className="text-xs text-gray-400 max-w-xs">
                            Try asking: &quot;What is this book about?&quot;, &quot;Borrow this book&quot;, or &quot;Recommend similar books&quot;.
                        </p>
                    </div>
                )}

                {messages.map((msg) => (
                    <TranscriptBubble key={msg.id} message={msg} />
                ))}

                {currentTranscript && (
                    <div className="flex items-start gap-2.5 my-2 flex-row-reverse opacity-70">
                        <div className="bg-indigo-900/60 border border-indigo-500/30 text-indigo-100 rounded-2xl px-4 py-2 text-sm italic">
                            {currentTranscript}...
                        </div>
                    </div>
                )}

                {pendingAction && <ActionConfirmation pendingAction={pendingAction} onConfirm={confirmAction} />}
            </div>

            {/* Voice Control & Text Fallback Input */}
            <div className="p-4 border-t border-gray-800 bg-gray-900/60">
                <div className="flex items-center gap-3 mb-3">
                    <button
                        onClick={isListening ? stopListening : startListening}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all shadow-lg ${
                            isListening
                                ? "bg-red-600 hover:bg-red-500 text-white animate-pulse"
                                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white"
                        }`}
                    >
                        {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        <span>{isListening ? "Stop Listening" : "Push to Talk"}</span>
                    </button>
                </div>

                <form onSubmit={handleSendText} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Or type your voice query..."
                        className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3.5 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                        type="submit"
                        disabled={!textInput.trim()}
                        className="p-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl transition-colors"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default VoicePanel;
