"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { BookList } from "@/components/books/BookList";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import BookUploadModal from "@/components/books/BookUploadModal";
import { useAuth } from "@/hooks/useAuth";

export default function BooksPage() {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [showUpload, setShowUpload] = useState(false);

    return (
        <DashboardLayout>
            <div className="flex flex-col space-y-8 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">Library</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Explore our entire collection of books.</p>
                    </div>
                    {user?.role === "admin" && (
                        <Button
                            id="upload-book-btn"
                            onClick={() => setShowUpload(true)}
                            className="gap-2 rounded-xl px-5 shadow-sm shadow-blue-200 text-sm"
                        >
                            <Plus className="h-4 w-4" />
                            Upload Book
                        </Button>
                    )}
                </div>

                {/* Search bar */}
                <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <Search className="h-5 w-5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <Input
                        type="text"
                        id="book-search"
                        placeholder="Search by title, author, or genre…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 border-none shadow-none focus-visible:ring-0 bg-transparent h-11 text-slate-700 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />
                    <button className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0">
                        <SlidersHorizontal className="h-4 w-4" />
                        <span className="hidden sm:inline">Filters</span>
                    </button>
                </div>

                {/* Book grid */}
                <BookList searchQuery={searchQuery} />
            </div>

            {showUpload && <BookUploadModal onClose={() => setShowUpload(false)} />}
        </DashboardLayout>
    );
}
