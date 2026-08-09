import React from "react";
import { MessageTurn } from "@/hooks/useVoiceSession";
import { Bot, User } from "lucide-react";

interface TranscriptBubbleProps {
    message: MessageTurn;
}

export const TranscriptBubble: React.FC<TranscriptBubbleProps> = ({ message }) => {
    const isUser = message.speaker === "user";

    return (
        <div className={`flex items-start gap-2.5 my-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
            <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    isUser ? "bg-indigo-600 text-white" : "bg-purple-600 text-white"
                }`}
            >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div
                className={`flex flex-col max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm text-sm ${
                    isUser
                        ? "bg-indigo-600 text-white rounded-tr-none"
                        : "bg-gray-800 text-gray-100 border border-gray-700 rounded-tl-none"
                }`}
            >
                <div className="font-medium whitespace-pre-wrap">{message.text}</div>
                <div className={`text-[10px] mt-1 self-end ${isUser ? "text-indigo-200" : "text-gray-400"}`}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
            </div>
        </div>
    );
};

export default TranscriptBubble;
