"use client";

import React, { useEffect, useState } from "react";
import { groupService, GroupBookDetail } from "@/services/groupService";
import { UserGroup } from "@/types/rbac";
import { Users, Lock, ChevronRight, BookOpen } from "lucide-react";
import Book3DCard from "@/components/home/3d/Book3DCard";
import { useRouter } from "next/navigation";

interface GroupWithBooks {
    group: UserGroup;
    books: GroupBookDetail[];
}

export default function GroupLibrariesSection() {
    const [groupLibraries, setGroupLibraries] = useState<GroupWithBooks[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchGroupLibraries = async () => {
            try {
                const userGroups = await groupService.getGroups();
                if (!userGroups || userGroups.length === 0) {
                    setGroupLibraries([]);
                    return;
                }

                const results: GroupWithBooks[] = [];
                for (const group of userGroups) {
                    try {
                        const books = await groupService.getGroupBooks(group.id);
                        if (books && books.length > 0) {
                            results.push({ group, books });
                        }
                    } catch (e) {
                        console.error(`Failed to fetch books for group ${group.id}`, e);
                    }
                }
                setGroupLibraries(results);
            } catch (error) {
                console.error("Failed to load user group libraries", error);
            } finally {
                setLoading(false);
            }
        };

        fetchGroupLibraries();
    }, []);

    // Rule: "If a user not having in a group that have Private book liberary. Don't show on user dashboard."
    if (loading || groupLibraries.length === 0) {
        return null;
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                        <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> My Group Libraries
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Private courseware and book collections from your enrolled cohorts
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                {groupLibraries.map(({ group, books }) => (
                    <div 
                        key={group.id} 
                        className="bg-[var(--card)] rounded-3xl border border-[var(--border)] p-6 shadow-sm space-y-4"
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                        {group.name}
                                    </h3>
                                    {group.description && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{group.description}</p>
                                    )}
                                </div>
                            </div>
                            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                {books.length} {books.length === 1 ? "Book" : "Books"}
                            </span>
                        </div>

                        <div className="flex overflow-x-auto gap-6 pb-4 pt-2 px-2 hide-scrollbar scrollbar-hide">
                            {books.map((b) => (
                                <div 
                                    key={b.book_id} 
                                    className="snap-center shrink-0 cursor-pointer" 
                                    onClick={() => router.push(`/books/${b.book_id}`)}
                                >
                                    <Book3DCard 
                                        title={b.title}
                                        author={b.author}
                                        genre="Group Private"
                                        rating="4.8"
                                        summary={`Exclusive content assigned to ${group.name}`}
                                        coverUrl="/covers/default-book.png"
                                        badge={group.name}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
