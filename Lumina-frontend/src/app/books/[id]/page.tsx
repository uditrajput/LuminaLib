"use client";

import React, { useState, use } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useBook } from "@/hooks/useBooks";
import {
    BookOpen, User as AuthorIcon, Calendar, Tag, Star,
    BookMarked, BookCheck, AlertCircle, RefreshCw, ChevronLeft,
    MessageSquarePlus, Brain, Loader2, BarChart2, Trash2, Lock,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getBookReviews, addReview, borrowBook, returnBook,
    getBorrowStatus, getBookSummary,
} from "@/services/reviewService";
import { ReviewCreate } from "@/types/review";
import { deleteBook } from "@/services/bookService";
import { useRouter } from "next/navigation";
import EditBookModal from "@/components/books/EditBookModal";
import DeleteConfirmModal from "@/components/books/DeleteConfirmModal";

// Next.js 15 requires unwrapping params with `use()`
interface PageProps { params: Promise<{ id: string }> }

export default function BookDetailPage({ params }: PageProps) {
    const { id } = use(params);
    const bookId = Number(id);
    const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
    const qc = useQueryClient();
    const router = useRouter();
    const isAdmin = user?.role === "admin";
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // ── Core book fetch ──────────────────────────────────────────────────────
    const { data: book, isLoading, isError, refetch } = useBook(id);

    // ── Reviews (non-fatal if 404) ───────────────────────────────────────────
    const { data: reviews } = useQuery({
        queryKey: ["reviews", bookId],
        queryFn: () => getBookReviews(bookId),
        enabled: !!bookId,
        retry: false,
    });

    // ── Borrow status (non-fatal) ────────────────────────────────────────────
    const { data: borrowStatus, refetch: refetchBorrow } = useQuery({
        queryKey: ["borrow", bookId],
        queryFn: () => getBorrowStatus(bookId),
        enabled: isAuthenticated && !!bookId,
        retry: false,
    });

    // ── AI Summary (non-fatal) ───────────────────────────────────────────────
    const { data: summary } = useQuery({
        queryKey: ["summary", bookId],
        queryFn: () => getBookSummary(bookId),
        enabled: !!bookId,
        retry: false,
    });

    // ── Mutations ────────────────────────────────────────────────────────────
    const [borrowError, setBorrowError] = useState<string | null>(null);
    const borrowMut = useMutation({
        mutationFn: () => borrowBook(bookId),
        onSuccess: async () => {
            setBorrowError(null);
            // Invalidate + await refetch so isBorrowed updates immediately
            await qc.invalidateQueries({ queryKey: ["borrow", bookId] });
        },
        onError: (err: any) => {
            setBorrowError(err?.response?.data?.detail || err?.message || "Could not borrow this book. Please try again.");
        },
    });
    const returnMut = useMutation({
        mutationFn: () => returnBook(bookId),
        onSuccess: async () => {
            setBorrowError(null);
            await qc.invalidateQueries({ queryKey: ["borrow", bookId] });
        },
        onError: (err: any) => {
            setBorrowError(err?.response?.data?.detail || err?.message || "Could not return this book. Please try again.");
        },
    });
    const deleteMut = useMutation({
        mutationFn: () => deleteBook(bookId),
        onSuccess: () => {
            router.push("/books");
        },
        onError: (err: any) => {
            setBorrowError(err?.response?.data?.detail || err?.message || "Could not delete book.");
        },
    });

    // ── Review form state ────────────────────────────────────────────────────
    const [reviewText, setReviewText] = useState("");
    const [rating, setRating] = useState(5);
    const [reviewHover, setReviewHover] = useState(0);
    const reviewMut = useMutation({
        mutationFn: (data: ReviewCreate) => addReview(bookId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["reviews", bookId] });
            qc.invalidateQueries({ queryKey: ["summary", bookId] });
            setReviewText("");
            setRating(5);
        },
    });

    // ── Derived states ───────────────────────────────────────────────────────
    const status = borrowStatus?.status?.toLowerCase();
    const isBorrowed = status === "borrowed";
    const hasEverBorrowed = status === "borrowed" || status === "returned";

    // ── Loading & error states ───────────────────────────────────────────────
    if (isAuthLoading || isLoading) return (
        <DashboardLayout>
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
        </DashboardLayout>
    );

    if (!isAuthenticated) return (
        <DashboardLayout>
            <div className="flex flex-col items-center gap-4 p-12 bg-white rounded-3xl border border-amber-100 shadow-sm text-center max-w-md mx-auto mt-12">
                <div className="p-4 bg-amber-50 rounded-full">
                    <Lock className="h-10 w-10 text-amber-500" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-1">Authentication Required</h2>
                    <p className="text-sm text-slate-500">You must be logged in to view book details and borrow books.</p>
                </div>
                <div className="flex gap-3">
                    <Link href={`/login?redirect=/books/${bookId}`}>
                        <Button className="gap-2 rounded-xl">
                            Sign In
                        </Button>
                    </Link>
                    <Link href="/books">
                        <Button variant="outline" className="gap-2 rounded-xl">
                            <ChevronLeft className="h-4 w-4" /> Back to Library
                        </Button>
                    </Link>
                </div>
            </div>
        </DashboardLayout>
    );

    if (isError || !book) return (
        <DashboardLayout>
            <div className="flex flex-col items-center gap-4 p-12 bg-white rounded-3xl border border-red-100 shadow-sm text-center max-w-md mx-auto mt-12">
                <div className="p-4 bg-red-50 rounded-full">
                    <AlertCircle className="h-10 w-10 text-red-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-1">Book not found</h2>
                    <p className="text-sm text-slate-500">This book may have been removed or the link is incorrect.</p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={() => refetch()} variant="outline" className="gap-2 rounded-xl">
                        <RefreshCw className="h-4 w-4" /> Retry
                    </Button>
                    <Link href="/books">
                        <Button variant="outline" className="gap-2 rounded-xl">
                            <ChevronLeft className="h-4 w-4" /> Back to Library
                        </Button>
                    </Link>
                </div>
            </div>
        </DashboardLayout>
    );

    const avgRating = summary?.average_rating ?? 0;

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto animate-fade-in space-y-8">
                {/* Back */}
                <Link href="/books" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                    Back to Library
                </Link>

                {/* Hero card */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                        {/* Cover */}
                        <div className="relative h-64 md:h-auto bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center border-r border-slate-100 md:rounded-l-3xl overflow-hidden">
                            {book.cover_image_url ? (
                                <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-cover" />
                            ) : (
                                <BookOpen className="h-20 w-20 text-blue-200" />
                            )}
                        </div>

                        {/* Info */}
                        <div className="md:col-span-2 p-8 flex flex-col justify-between gap-6">
                            <div className="space-y-3">
                                {(book as any).genre && (
                                    <span className="status-badge bg-blue-100 text-blue-700">
                                        <Tag className="h-2.5 w-2.5" />
                                        {(book as any).genre}
                                    </span>
                                )}
                                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">{book.title}</h1>
                                <div className="flex items-center gap-2 text-slate-500 text-sm">
                                    <AuthorIcon className="h-4 w-4" />
                                    <span>{book.author}</span>
                                    {(book as any).year_published && (
                                        <>
                                            <span className="text-slate-300">·</span>
                                            <Calendar className="h-3.5 w-3.5" />
                                            <span>{(book as any).year_published}</span>
                                        </>
                                    )}
                                </div>

                                {/* Star rating */}
                                {summary && summary.total_reviews > 0 && (
                                    <div className="flex items-center gap-2">
                                        <div className="flex">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star key={s} className={`h-4 w-4 ${s <= Math.round(avgRating) ? "text-amber-400 fill-amber-400" : "text-slate-200"}`} />
                                            ))}
                                        </div>
                                        <span className="text-sm font-semibold text-slate-700">{avgRating.toFixed(1)}</span>
                                        <span className="text-xs text-slate-400">({summary.total_reviews} reviews)</span>
                                    </div>
                                )}

                                {book.description && (
                                    <p className="text-sm text-slate-600 leading-relaxed">{book.description}</p>
                                )}
                            </div>

                            {/* Borrow / Return section */}
                            {isAuthenticated && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex flex-wrap items-center gap-3">
                                        {isBorrowed ? (
                                            <>
                                                {/* Currently borrowed badge */}
                                                <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 px-3 py-2 rounded-xl">
                                                    <BookCheck className="h-4 w-4" />
                                                    Currently borrowed
                                                </div>
                                                {/* Return button */}
                                                <Button
                                                    onClick={() => returnMut.mutate()}
                                                    disabled={returnMut.isPending}
                                                    variant="outline"
                                                    className="gap-2 rounded-xl border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                                                >
                                                    {returnMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookCheck className="h-4 w-4" />}
                                                    Return Book
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                {status === "returned" && (
                                                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/50 px-3 py-2 rounded-xl">
                                                        <BookCheck className="h-4 w-4" />
                                                        Previously borrowed & returned
                                                    </div>
                                                )}
                                                <Button
                                                    onClick={() => { setBorrowError(null); borrowMut.mutate(); }}
                                                    disabled={borrowMut.isPending}
                                                    className="gap-2 rounded-xl"
                                                >
                                                    {borrowMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookMarked className="h-4 w-4" />}
                                                    Borrow Book
                                                </Button>
                                            </>
                                        )}

                                        {isAdmin && (
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => setShowEditModal(true)}
                                                    variant="outline"
                                                    className="gap-2 rounded-xl border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                                                >
                                                    <RefreshCw className="h-4 w-4" />
                                                    Edit Book
                                                </Button>
                                                <Button
                                                    onClick={() => setShowDeleteConfirm(true)}
                                                    disabled={deleteMut.isPending}
                                                    variant="outline"
                                                    className="gap-2 rounded-xl border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                                                >
                                                    {deleteMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                    Delete Book
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Borrow/Return error feedback */}
                                    {borrowError && (
                                        <p className="text-xs text-red-500 flex items-center gap-1.5 mt-1">
                                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                            {borrowError}
                                        </p>
                                    )}

                                    {/* Borrow success feedback */}
                                    {borrowMut.isSuccess && isBorrowed && (
                                        <p className="text-xs text-green-600 flex items-center gap-1.5">
                                            <BookCheck className="h-3.5 w-3.5" />
                                            Book borrowed successfully! You can now read and review it.
                                        </p>
                                    )}

                                    {/* Return success feedback */}
                                    {returnMut.isSuccess && !isBorrowed && (
                                        <p className="text-xs text-green-600 flex items-center gap-1.5">
                                            <BookCheck className="h-3.5 w-3.5" />
                                            Book returned successfully!
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* AI Summary */}
                {summary?.summary && (
                    <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-3xl p-6 space-y-3">
                        <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
                            <Brain className="h-5 w-5" />
                            AI-Generated Summary
                        </div>
                        <p className="text-slate-700 text-sm leading-relaxed">{summary.summary}</p>
                    </div>
                )}

                {/* Stats */}
                {summary && summary.total_reviews > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
                            <BarChart2 className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                            <p className="text-2xl font-extrabold text-slate-900">{avgRating.toFixed(1)}</p>
                            <p className="text-xs text-slate-500">Avg Rating</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
                            <MessageSquarePlus className="h-5 w-5 text-violet-500 mx-auto mb-1" />
                            <p className="text-2xl font-extrabold text-slate-900">{summary.total_reviews}</p>
                            <p className="text-xs text-slate-500">Reviews</p>
                        </div>
                    </div>
                )}

                {/* Reviews list */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-900 border-l-4 border-blue-600 pl-3">Reviews</h2>
                    {reviews && reviews.length > 0 ? reviews.map((rev) => {
                        // Backend schemas handle date named `created_date` or `created_at` depending on model/schema alignment
                        const rawDate = (rev as any).created_date || (rev as any).created_at;
                        const dateObj = new Date(rawDate);
                        const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString() : "";

                        return (
                            <div key={rev.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                            {(rev.full_name || "U")[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{rev.full_name || "User"}</p>
                                            <div className="flex">
                                                {[1, 2, 3, 4, 5].map((s) => (
                                                    <Star key={s} className={`h-3 w-3 ${s <= rev.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"}`} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    {dateStr && <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{dateStr}</p>}
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed pl-10 italic">"{rev.review_text}"</p>
                            </div>
                        )
                    }) : (
                        <p className="text-sm text-slate-400 bg-white rounded-2xl border border-slate-100 p-6 text-center">
                            No reviews yet. Borrow this book and be the first to review it!
                        </p>
                    )}
                </div>

                {/* Write review — show only if user currently has borrowed the book */}
                {isAuthenticated && isBorrowed && (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <MessageSquarePlus className="h-5 w-5 text-blue-500" />
                            Write a Review
                        </h3>

                        {/* Star picker */}
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setRating(s)}
                                    onMouseEnter={() => setReviewHover(s)}
                                    onMouseLeave={() => setReviewHover(0)}
                                >
                                    <Star
                                        className={`h-6 w-6 transition-colors cursor-pointer ${s <= (reviewHover || rating) ? "text-amber-400 fill-amber-400" : "text-slate-200 hover:text-amber-200"}`}
                                    />
                                </button>
                            ))}
                            <span className="ml-2 text-sm text-slate-500 self-center">{rating}/5</span>
                        </div>

                        <textarea
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder="Share your thoughts about this book…"
                            rows={4}
                            className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
                        />

                        {reviewMut.isError && (
                            <p className="text-xs text-red-500 flex items-center gap-1.5">
                                <AlertCircle className="h-3.5 w-3.5" />
                                {(reviewMut.error as any)?.response?.data?.detail ?? "Could not submit review."}
                            </p>
                        )}
                        {reviewMut.isSuccess && (
                            <p className="text-xs text-green-600 flex items-center gap-1.5">
                                <BookCheck className="h-3.5 w-3.5" />
                                Review submitted successfully!
                            </p>
                        )}

                        <Button
                            onClick={() => reviewMut.mutate({ review_text: reviewText, rating })}
                            disabled={reviewMut.isPending || !reviewText.trim()}
                            className="gap-2 rounded-xl"
                        >
                            {reviewMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
                            Submit Review
                        </Button>
                    </div>
                )}
            </div>

            {showEditModal && book && (
                <EditBookModal book={book} onClose={() => { setShowEditModal(false); refetch(); }} />
            )}

            {showDeleteConfirm && (
                <DeleteConfirmModal
                    onConfirm={() => deleteMut.mutate()}
                    onCancel={() => setShowDeleteConfirm(false)}
                    isDeleting={deleteMut.isPending}
                />
            )}
        </DashboardLayout>
    );
}
