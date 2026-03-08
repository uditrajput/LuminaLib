"use client";

import React, { useState } from "react";
import { useBooks } from "@/hooks/useBooks";
import { BookCard } from "./BookCard";
import { Library, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "../ui/Button";

export function BookList({ searchQuery = "" }: { searchQuery?: string }) {
    const [page, setPage] = useState(1);
    const { data, isLoading, isError, error, refetch } = useBooks(page, 12, searchQuery);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="rounded-2xl p-[2px] bg-gradient-to-br from-slate-200 to-slate-300 h-72 overflow-hidden">
                        <div className="bg-white rounded-[14px] h-full overflow-hidden">
                            <div className="h-44 skeleton" />
                            <div className="p-5 space-y-3">
                                <div className="h-4 skeleton rounded w-3/4" />
                                <div className="h-3 skeleton rounded w-1/2" />
                                <div className="h-3 skeleton rounded w-full" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-red-100 shadow-sm text-center">
                <div className="p-3 bg-red-50 text-red-400 rounded-full mb-3">
                    <AlertCircle className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Failed to load books</h3>
                <p className="text-slate-500 text-sm mb-5 max-w-sm">
                    {error instanceof Error ? error.message : "An unexpected error occurred."}
                </p>
                <Button onClick={() => refetch()} variant="outline" className="gap-2 rounded-xl">
                    <RefreshCw className="h-4 w-4" /> Try Again
                </Button>
            </div>
        );
    }

    const books = data?.items ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.ceil(total / 12);

    if (books.length === 0) {
        if (searchQuery) {
            return (
                <div className="flex flex-col items-center justify-center p-16 bg-white rounded-3xl border border-slate-100 shadow-sm text-center">
                    <div className="p-4 bg-slate-50 text-slate-300 rounded-full mb-4">
                        <Search className="h-10 w-10" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-1">No matches found</h3>
                    <p className="text-slate-400 text-sm">We couldn't find any books matching "{searchQuery}".</p>
                </div>
            );
        }
        return (
            <div className="flex flex-col items-center justify-center p-16 bg-white rounded-3xl border border-slate-100 shadow-sm text-center">
                <div className="p-4 bg-slate-50 text-slate-300 rounded-full mb-4">
                    <Library className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">No books yet</h3>
                <p className="text-slate-400 text-sm">Upload the first book to get started.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-fade-in">
                {books.map((book) => (
                    <BookCard key={book.id} book={book} />
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="rounded-xl h-9 w-9"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-slate-500 font-medium">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="rounded-xl h-9 w-9"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
