"use client";

import React from "react";
import { Trash2, AlertTriangle, X } from "lucide-react";

interface DeleteChatModalProps {
    isOpen: boolean;
    sessionTitle: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDeleting?: boolean;
}

export default function DeleteChatModal({
    isOpen,
    sessionTitle,
    onConfirm,
    onCancel,
    isDeleting = false,
}: DeleteChatModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-md transition-opacity duration-300"
                onClick={!isDeleting ? onCancel : undefined}
            />

            {/* Modal Card */}
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] border border-slate-100 dark:border-slate-800 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 z-10">
                {/* Close Button */}
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isDeleting}
                    className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="p-7 text-center flex flex-col items-center">
                    {/* Floating Trash Icon */}
                    <div className="relative mb-5 group">
                        <div className="absolute inset-0 bg-red-500 blur-xl opacity-20 dark:opacity-40 animate-pulse rounded-full" />
                        <div className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-950/60 dark:to-rose-900/60 border border-red-200 dark:border-red-800/60 shadow-md rounded-2xl">
                            <Trash2 className="w-8 h-8 text-red-500 dark:text-red-400 drop-shadow-sm" strokeWidth={1.75} />
                        </div>
                    </div>

                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1.5 tracking-tight">
                        Delete Chat Session?
                    </h3>
                    
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                        Are you sure you want to delete <span className="font-semibold text-slate-700 dark:text-slate-200">&ldquo;{sessionTitle}&rdquo;</span>? This will permanently remove all messages in this conversation.
                    </p>

                    {/* Action Buttons */}
                    <div className="flex w-full gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isDeleting}
                            className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all duration-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isDeleting}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all duration-200"
                        >
                            {isDeleting ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                "Yes, Delete"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
