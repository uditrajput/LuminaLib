"use client";

import React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
    onConfirm: () => void;
    onCancel: () => void;
    isDeleting: boolean;
}

export default function DeleteConfirmModal({ onConfirm, onCancel, isDeleting }: Props) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop with blur */}
            <div
                className="absolute inset-0 bg-slate-900/40 dark:bg-slate-900/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
                onClick={!isDeleting ? onCancel : undefined}
            />

            {/* 3D Animated Modal Card */}
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] border border-slate-100 dark:border-slate-800 overflow-hidden transform transition-all animate-in zoom-in-95 duration-300">
                {/* 3D Top Highlight Edge (Glassmorphism highlight) */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent z-10" />

                <div className="p-8 text-center flex flex-col items-center">
                    {/* Floating Alert Icon - 3D styled */}
                    <div className="relative mb-6 group">
                        <div className="absolute inset-0 bg-red-500 blur-xl opacity-20 dark:opacity-40 animate-pulse rounded-full" />
                        <div className="relative flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/50 dark:to-rose-950/50 border border-white dark:border-red-800 shadow-[inset_0_4px_10px_rgba(255,255,255,0.7),0_10px_20px_rgba(239,68,68,0.2)] dark:shadow-[inset_0_4px_10px_rgba(255,255,255,0.1),0_10px_20px_rgba(239,68,68,0.4)] rounded-[1.5rem] transform group-hover:scale-105 transition-transform duration-300">
                            <Trash2 className="w-10 h-10 text-red-500 drop-shadow-md" strokeWidth={1.5} />
                        </div>
                    </div>

                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">
                        Delete Book?
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                        Are you sure you want to delete this book? This action <span className="font-semibold text-slate-700 dark:text-slate-200">cannot be undone</span> and will remove all associated data.
                    </p>

                    <div className="flex w-full gap-3">
                        <button
                            onClick={onCancel}
                            disabled={isDeleting}
                            className="flex-1 px-4 py-3 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 active:scale-95 transition-all duration-200"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isDeleting}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white font-semibold rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_14px_rgba(239,68,68,0.4)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(239,68,68,0.5)] active:scale-95 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] transition-all duration-200"
                        >
                            {isDeleting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
