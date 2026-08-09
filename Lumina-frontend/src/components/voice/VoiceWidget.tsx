"use client";

import React, { useState } from "react";
import { Mic, Sparkles } from "lucide-react";
import VoicePanel from "./VoicePanel";

interface VoiceWidgetProps {
    bookId?: string | number;
    bookTitle?: string;
    showFloatingButton?: boolean;
}

export const VoiceWidget: React.FC<VoiceWidgetProps> = ({ bookId, bookTitle, showFloatingButton = false }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {showFloatingButton && (
                <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
                    {bookTitle && (
                        <div className="hidden sm:flex items-center gap-1.5 bg-gray-900/90 text-gray-200 border border-gray-700/80 px-3 py-1.5 rounded-full text-xs shadow-lg backdrop-blur-md">
                            <span className="h-2 w-2 rounded-full bg-purple-400 animate-ping" />
                            <span className="truncate max-w-[150px] font-medium">{bookTitle}</span>
                        </div>
                    )}
                    <button
                        onClick={() => setIsOpen(true)}
                        className="relative group p-4 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-purple-500/50"
                        aria-label="Open Voice Assistant"
                    >
                        <Mic className="h-6 w-6" />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                        </span>
                    </button>
                </div>
            )}

            {/* Slide-over Voice Drawer */}
            <VoicePanel
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                bookId={bookId}
                bookTitle={bookTitle}
            />
        </>
    );
};

export default VoiceWidget;
