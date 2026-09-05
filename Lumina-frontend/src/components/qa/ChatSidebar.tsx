"use client";

import React, { useState } from "react";
import { ChatSession } from "@/services/qaService";
import { Plus, MessageSquare, Search, Trash2, Edit2, Check, X, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import DeleteChatModal from "@/components/qa/DeleteChatModal";
import { cn } from "@/lib/utils";

interface ChatSidebarProps {
    sessions: ChatSession[];
    activeSessionId: number | null;
    onSelectSession: (id: number) => void;
    onNewChat: () => void;
    onRenameSession: (id: number, newTitle: string) => Promise<void>;
    onDeleteSession: (id: number) => Promise<void>;
    isOpenMobile?: boolean;
    onCloseMobile?: () => void;
}

export default function ChatSidebar({
    sessions,
    activeSessionId,
    onSelectSession,
    onNewChat,
    onRenameSession,
    onDeleteSession,
    isOpenMobile = false,
    onCloseMobile,
}: ChatSidebarProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [deletingSession, setDeletingSession] = useState<ChatSession | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Only display sessions that are not empty (message_count !== 0 or matching search)
    const filteredSessions = (sessions || []).filter(
        (s) => s && (s.message_count === undefined || s.message_count > 0) && (s.title || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group sessions by date
    const groupSessions = (items: ChatSession[]) => {
        const today: ChatSession[] = [];
        const yesterday: ChatSession[] = [];
        const past7Days: ChatSession[] = [];
        const older: ChatSession[] = [];

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
        const startOf7Days = new Date(startOfToday.getTime() - 6 * 86400000);

        items.forEach((s) => {
            const date = new Date(s.updated_at || s.created_at);
            if (date >= startOfToday) {
                today.push(s);
            } else if (date >= startOfYesterday) {
                yesterday.push(s);
            } else if (date >= startOf7Days) {
                past7Days.push(s);
            } else {
                older.push(s);
            }
        });

        return { today, yesterday, past7Days, older };
    };

    const grouped = groupSessions(filteredSessions);

    const handleStartRename = (e: React.MouseEvent, s: ChatSession) => {
        e.stopPropagation();
        setEditingId(s.id);
        setEditTitle(s.title);
    };

    const handleSaveRename = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (editTitle.trim()) {
            await onRenameSession(id, editTitle.trim());
        }
        setEditingId(null);
    };

    const handleCancelRename = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingId(null);
    };

    const handleOpenDeleteModal = (e: React.MouseEvent, s: ChatSession) => {
        e.stopPropagation();
        setDeletingSession(s);
    };

    const handleConfirmDelete = async () => {
        if (!deletingSession) return;
        setIsDeleting(true);
        try {
            await onDeleteSession(deletingSession.id);
        } finally {
            setIsDeleting(false);
            setDeletingSession(null);
        }
    };

    const renderGroup = (title: string, list: ChatSession[]) => {
        if (list.length === 0) return null;
        return (
            <div className="space-y-1.5 mb-4">
                <div className="px-3 text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{title}</span>
                </div>
                {list.map((s) => {
                    const isActive = s.id === activeSessionId;
                    const isEditing = s.id === editingId;

                    return (
                        <div
                            key={s.id}
                            onClick={() => {
                                onSelectSession(s.id);
                                if (onCloseMobile) onCloseMobile();
                            }}
                            className={cn(
                                "group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all duration-200 border",
                                isActive
                                    ? "bg-purple-100/90 dark:bg-purple-900/40 text-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800/60 shadow-sm font-semibold"
                                    : "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-transparent"
                            )}
                        >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                                <MessageSquare
                                    className={cn(
                                        "h-4 w-4 shrink-0 transition-colors",
                                        isActive ? "text-purple-600 dark:text-purple-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                                    )}
                                />
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleSaveRename(e as any, s.id);
                                            if (e.key === "Escape") handleCancelRename(e as any);
                                        }}
                                        autoFocus
                                        className="w-full bg-white dark:bg-slate-900 px-2 py-1 rounded border border-purple-400 text-xs focus:outline-none"
                                    />
                                ) : (
                                    <span className="truncate">{s.title}</span>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                {isEditing ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={(e) => handleSaveRename(e, s.id)}
                                            className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-emerald-600 rounded transition"
                                            title="Save"
                                        >
                                            <Check className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCancelRename}
                                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 rounded transition"
                                            title="Cancel"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={(e) => handleStartRename(e, s)}
                                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded transition"
                                            title="Rename Chat"
                                        >
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => handleOpenDeleteModal(e, s)}
                                            className="p-1 hover:bg-red-100 dark:hover:bg-red-950 text-slate-400 hover:text-red-600 rounded transition"
                                            title="Delete Chat"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const sidebarContent = (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800/80 w-64 md:w-72 shrink-0 select-none">
            {/* Header / New Chat */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 space-y-3">
                <Button
                    onClick={() => {
                        onNewChat();
                        if (onCloseMobile) onCloseMobile();
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-2.5 rounded-xl shadow-sm transition duration-200"
                >
                    <Plus className="h-4 w-4" />
                    <span>New Chat</span>
                </Button>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search chats…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800/70 border border-transparent focus:border-purple-400 text-xs rounded-xl focus:outline-none transition"
                    />
                </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredSessions.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                        <Sparkles className="h-6 w-6 mx-auto mb-2 text-purple-400/50" />
                        No past chats yet. Start a new conversation!
                    </div>
                ) : (
                    <>
                        {renderGroup("Today", grouped.today)}
                        {renderGroup("Yesterday", grouped.yesterday)}
                        {renderGroup("Previous 7 Days", grouped.past7Days)}
                        {renderGroup("Older", grouped.older)}
                    </>
                )}
            </div>

            {/* Interactive Custom Delete Modal */}
            <DeleteChatModal
                isOpen={Boolean(deletingSession)}
                sessionTitle={deletingSession?.title || "this chat session"}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeletingSession(null)}
                isDeleting={isDeleting}
            />
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <div className="hidden md:block h-full">{sidebarContent}</div>

            {/* Mobile Drawer Overlay */}
            {isOpenMobile && (
                <div className="fixed inset-0 z-50 flex md:hidden">
                    <div
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
                        onClick={onCloseMobile}
                    />
                    <div className="relative z-10 w-72 h-full shadow-2xl animate-in slide-in-from-left">
                        {sidebarContent}
                    </div>
                </div>
            )}
        </>
    );
}
