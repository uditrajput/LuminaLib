"use client";

import React, { useState, use } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useBook } from "@/hooks/useBooks";
import {
    BookOpen, User as AuthorIcon, Calendar, Tag, Star,
    BookMarked, BookCheck, AlertCircle, RefreshCw, ChevronLeft,
    MessageSquarePlus, Brain, Loader2, BarChart2, Trash2, Lock, Headphones, Users2, Edit3
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getBookReviews, addReview, deleteReview, borrowBook, returnBook,
    getBorrowStatus, getBookSummary,
} from "@/services/reviewService";
import { ReviewCreate } from "@/types/review";
import { deleteBook } from "@/services/bookService";
import { useRouter } from "next/navigation";
import EditBookModal from "@/components/books/EditBookModal";
import DeleteConfirmModal from "@/components/books/DeleteConfirmModal";
import PDFReaderModal from "@/components/books/PDFReaderModal";
import VoiceWidget from "@/components/voice/VoiceWidget";
import voiceService from "@/services/voiceService";
import { cleanAndNormalizeDevanagari } from "@/utils/devanagariConverter";


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
    const [showPdfReader, setShowPdfReader] = useState(false);
    const [isPlayingAudiobook, setIsPlayingAudiobook] = useState(false);
    const [audioSpeed, setAudioSpeed] = useState(1.0);

    const toggleAudiobook = async () => {
        if (isPlayingAudiobook) {
            voiceService.stopCurrentSpeech();
            setIsPlayingAudiobook(false);
            return;
        }

        if (!book) return;
        const cleanTitle = cleanAndNormalizeDevanagari(book.title || "");
        const cleanAuthor = cleanAndNormalizeDevanagari(book.author || "");
        const cleanDesc = cleanAndNormalizeDevanagari(book.description || "");

        const isIndic = /[\u0900-\u097F]/.test(cleanTitle + cleanDesc);
        const narrationParts = [cleanTitle];
        if (cleanAuthor) narrationParts.push(isIndic ? `लेखक: ${cleanAuthor}` : `By ${cleanAuthor}`);
        if (cleanDesc) narrationParts.push(cleanDesc);

        const fullScript = narrationParts.join(". ");

        setIsPlayingAudiobook(true);
        await voiceService.speakText(fullScript, {
            speed: audioSpeed,
            onStart: () => setIsPlayingAudiobook(true),
            onEnd: () => setIsPlayingAudiobook(false),
            onError: () => setIsPlayingAudiobook(false),
        });
    };


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

    // ── Audiobook + Discussions (v4.0 wiring) ─────────────────────────────────
    const { data: audioData } = useQuery({
        queryKey: ["audiobook", bookId],
        queryFn: async () => {
            const r = await (await import("@/services/apiClient")).default.get(`/books/${bookId}/audio`);
            return r.data;
        },
        enabled: !!bookId,
        retry: false,
    });
    const { data: discussions, refetch: refetchDisc } = useQuery({
        queryKey: ["discussions", bookId],
        queryFn: async () => {
            const r = await (await import("@/services/apiClient")).default.get(`/books/${bookId}/discussions`);
            return r.data as any[];
        },
        enabled: !!bookId,
        retry: false,
    });
    const [discText, setDiscText] = useState("");
    const discMut = useMutation({
        mutationFn: async () => {
            const api = (await import("@/services/apiClient")).default;
            return api.post(`/books/${bookId}/discussions`, { content: discText, rating: 5 });
        },
        onSuccess: async () => { setDiscText(""); refetchDisc(); },
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

    // ── Pagination limits for reviews and discussions ────────────────────────
    const [reviewsLimit, setReviewsLimit] = useState(3);
    const [discussionsLimit, setDiscussionsLimit] = useState(5);

    // ── Review form state ────────────────────────────────────────────────────
    const userReview = reviews?.find((r) => String(r.user_id) === String(user?.id));
    const [isEditingReview, setIsEditingReview] = useState(false);
    const [reviewText, setReviewText] = useState("");
    const [rating, setRating] = useState(5);
    const [reviewHover, setReviewHover] = useState(0);

    const handleStartEditReview = (targetReview?: any) => {
        const target = targetReview || userReview;
        if (target) {
            setReviewText(target.review_text);
            setRating(target.rating);
            setIsEditingReview(true);
        }
    };

    const handleCancelEditReview = () => {
        setIsEditingReview(false);
        setReviewText("");
        setRating(5);
    };

    const reviewMut = useMutation({
        mutationFn: (data: ReviewCreate) => addReview(bookId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["reviews", bookId] });
            qc.invalidateQueries({ queryKey: ["summary", bookId] });
            setIsEditingReview(false);
            setReviewText("");
            setRating(5);
        },
    });

    const [deleteReviewTargetId, setDeleteReviewTargetId] = useState<number | null>(null);
    const [showDeleteReviewModal, setShowDeleteReviewModal] = useState(false);

    const deleteReviewMut = useMutation({
        mutationFn: (reviewId?: number) => deleteReview(bookId, reviewId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["reviews", bookId] });
            qc.invalidateQueries({ queryKey: ["summary", bookId] });
            setIsEditingReview(false);
            setReviewText("");
            setRating(5);
            setShowDeleteReviewModal(false);
            setDeleteReviewTargetId(null);
        },
    });

    const handleDeleteReview = (reviewId?: number) => {
        setDeleteReviewTargetId(reviewId || null);
        setShowDeleteReviewModal(true);
    };

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
            <div className="flex flex-col items-center gap-4 p-12 bg-white dark:bg-slate-900 rounded-3xl border border-amber-100 dark:border-amber-900/30 shadow-sm text-center max-w-md mx-auto mt-12">
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-full">
                    <Lock className="h-10 w-10 text-amber-500" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Authentication Required</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">You must be logged in to view book details and borrow books.</p>
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
            <div className="flex flex-col items-center gap-4 p-12 bg-white dark:bg-slate-900 rounded-3xl border border-red-100 dark:border-red-900/30 shadow-sm text-center max-w-md mx-auto mt-12">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full">
                    <AlertCircle className="h-10 w-10 text-red-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Book not found</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">This book may have been removed or the link is incorrect.</p>
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
                <Link href="/books" className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                    Back to Library
                </Link>

                {/* Hero card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                        {/* Cover */}
                        <div className="relative h-64 md:h-auto bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center border-r border-slate-100 dark:border-slate-800 md:rounded-l-3xl overflow-hidden">
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
                                    <span className="status-badge bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                        <Tag className="h-2.5 w-2.5" />
                                        {(book as any).genre}
                                    </span>
                                )}
                                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">{book.title}</h1>
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
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
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{avgRating.toFixed(1)}</span>
                                        <span className="text-xs text-slate-400 dark:text-slate-500">({summary.total_reviews} reviews)</span>
                                    </div>
                                )}
                                {/* Audiobook & Discussions */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={toggleAudiobook}
                                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-medium cursor-pointer transition-all ${
                                            isPlayingAudiobook
                                                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm ring-2 ring-indigo-300 dark:ring-indigo-800"
                                                : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                        }`}
                                    >
                                        <Headphones className={`h-3.5 w-3.5 ${isPlayingAudiobook ? "animate-pulse" : ""}`} />
                                        {isPlayingAudiobook ? "Playing Audiobook • Click to Pause" : "Audiobook • Ready"}
                                    </button>

                                    {isPlayingAudiobook && (
                                        <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full text-xs text-slate-600 dark:text-slate-300 border">
                                            <span className="font-mono">{audioSpeed}x</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const nextSpeed = audioSpeed === 1.0 ? 1.25 : audioSpeed === 1.25 ? 1.5 : audioSpeed === 1.5 ? 0.75 : 1.0;
                                                    setAudioSpeed(nextSpeed);
                                                }}
                                                className="hover:text-indigo-600 font-semibold px-1 underline"
                                                title="Change speed"
                                            >
                                                Speed
                                            </button>
                                        </div>
                                    )}

                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs text-slate-500">
                                        <Users2 className="h-3.5 w-3.5" /> {discussions?.length ?? 0} discussions
                                    </span>
                                </div>

                                {book.description && (
                                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                                        {cleanAndNormalizeDevanagari(book.description)}
                                    </p>
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
                                                {/* Read PDF Button */}
                                                <Button
                                                    onClick={() => setShowPdfReader(true)}
                                                    className="gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md hover:shadow-lg"
                                                >
                                                    <BookOpen className="h-4 w-4" />
                                                    Read PDF Book
                                                </Button>
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
                    <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/10 dark:to-violet-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-3xl p-6 space-y-3">
                        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-semibold text-sm">
                            <Brain className="h-5 w-5" />
                            AI-Generated Summary
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{summary.summary}</p>
                    </div>
                )}

                {/* Stats */}
                {summary && summary.total_reviews > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 text-center">
                            <BarChart2 className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{avgRating.toFixed(1)}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Avg Rating</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 text-center">
                            <MessageSquarePlus className="h-5 w-5 text-violet-500 mx-auto mb-1" />
                            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{summary.total_reviews}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Reviews</p>
                        </div>
                    </div>
                )}

                {/* Discussions (Social Reading) */}
                <div className="space-y-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                            <Users2 className="h-5 w-5 text-indigo-500" /> Discussions
                        </h2>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {(discussions || []).length} posts
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <input
                            value={discText}
                            onChange={(e) => setDiscText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey && discText.trim() && !discMut.isPending) {
                                    e.preventDefault();
                                    discMut.mutate();
                                }
                            }}
                            placeholder="Share a thought with your cohort…"
                            className="flex-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                        />
                        <Button
                            onClick={() => discMut.mutate()}
                            disabled={!discText.trim() || discMut.isPending}
                            className="rounded-xl px-5 bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {discMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
                        </Button>
                    </div>
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                        {(discussions || []).length === 0 ? (
                            <p className="text-xs text-slate-400 dark:text-slate-500 py-4 text-center">
                                No discussions yet — share the first thought!
                            </p>
                        ) : (
                            (discussions || []).slice(0, discussionsLimit).map((d: any) => {
                                const isMe = String(d.user_id) === String(user?.id);
                                const authorName = d.user_name || (isMe ? (user?.full_name || "You") : "Reader");
                                return (
                                    <div key={d.id} className="p-3.5 border border-slate-100 dark:border-slate-800 rounded-xl text-sm bg-slate-50/70 dark:bg-slate-800/60 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] flex items-center justify-center">
                                                    {(authorName[0] || "U").toUpperCase()}
                                                </div>
                                                <span className="font-semibold text-xs text-slate-900 dark:text-slate-200">
                                                    {authorName}
                                                    {isMe && (
                                                        <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-normal bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300">
                                                            You
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                                {new Date(d.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-slate-800 dark:text-slate-200 pl-8">{d.content}</p>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    {(discussions || []).length > discussionsLimit && (
                        <div className="text-center pt-2">
                            <button
                                type="button"
                                onClick={() => setDiscussionsLimit((prev) => prev + 5)}
                                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline px-4 py-2"
                            >
                                Load More Discussions ({(discussions || []).length - discussionsLimit} remaining) ↓
                            </button>
                        </div>
                    )}
                </div>

                {/* Reviews list */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">Reviews</h2>
                    </div>

                    {reviews && reviews.length > 0 ? (
                        <>
                            {reviews.slice(0, reviewsLimit).map((rev) => {
                                const rawDate = (rev as any).created_date || (rev as any).created_at;
                                const dateObj = new Date(rawDate);
                                const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString() : "";
                                const isMe = String(rev.user_id) === String(user?.id);
                                const reviewerName = rev.full_name || (isMe ? (user?.full_name || "You") : "Reader");

                                return (
                                    <div key={rev.id} className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                                                    {(reviewerName[0] || "U").toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{reviewerName}</p>
                                                        {isMe && (
                                                            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800/60 px-2 py-0.2 rounded-full">
                                                                You
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex mt-0.5">
                                                        {[1, 2, 3, 4, 5].map((s) => (
                                                            <Star key={s} className={`h-3 w-3 ${s <= rev.rating ? "text-amber-400 fill-amber-400" : "text-slate-200 dark:text-slate-700"}`} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-3">
                                                {/* On hover show pencil (edit) and delete icons at the end */}
                                                {(isMe || isAdmin) && (
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                                        {isMe && (
                                                            <button
                                                                onClick={() => handleStartEditReview(rev)}
                                                                className="p-1 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition rounded"
                                                                title="Edit Review"
                                                            >
                                                                <Edit3 className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteReview(rev.id)}
                                                            className="p-1 text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition rounded"
                                                            title="Delete Review"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                )}
                                                {dateStr && <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">{dateStr}</p>}
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pl-10 italic">"{rev.review_text}"</p>
                                    </div>
                                );
                            })}

                            {(reviews || []).length > reviewsLimit && (
                                <div className="text-center pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setReviewsLimit((prev) => prev + 5)}
                                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline px-4 py-2"
                                    >
                                        Load More Reviews ({(reviews || []).length - reviewsLimit} remaining) ↓
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 text-center">
                            No reviews yet. Borrow this book and be the first to review it!
                        </p>
                    )}
                </div>

                {/* Write / Edit review form — only display when editing or writing a new review */}
                {isAuthenticated && (isBorrowed || hasEverBorrowed) && (!userReview || isEditingReview) && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <MessageSquarePlus className="h-5 w-5 text-blue-500" />
                                {isEditingReview ? "Edit Your Review" : "Write a Review"}
                            </h3>
                        </div>

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
                            <span className="ml-2 text-sm text-slate-500 dark:text-slate-400 self-center">{rating}/5</span>
                        </div>

                        <textarea
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder="Share your thoughts about this book…"
                            rows={4}
                            className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-500 transition"
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
                                Review saved successfully!
                            </p>
                        )}

                        <div className="flex gap-2">
                            <Button
                                onClick={() => reviewMut.mutate({ review_text: reviewText, rating })}
                                disabled={reviewMut.isPending || !reviewText.trim()}
                                className="gap-2 rounded-xl"
                            >
                                {reviewMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
                                {isEditingReview ? "Update Review" : "Submit Review"}
                            </Button>
                            {isEditingReview && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCancelEditReview}
                                    className="rounded-xl"
                                >
                                    Cancel
                                </Button>
                            )}
                        </div>
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

            {showDeleteReviewModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full shadow-2xl space-y-4 animate-fade-in text-center">
                        <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 text-red-500 mx-auto flex items-center justify-center">
                            <Trash2 className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Review</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Are you sure you want to delete your review for this book? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => { setShowDeleteReviewModal(false); setDeleteReviewTargetId(null); }}
                                className="flex-1 rounded-xl border-slate-200 dark:border-slate-700"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    deleteReviewMut.mutate(deleteReviewTargetId || undefined);
                                }}
                                disabled={deleteReviewMut.isPending}
                                className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20"
                            >
                                {deleteReviewMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {showPdfReader && book && (
                <PDFReaderModal book={book} onClose={() => setShowPdfReader(false)} />
            )}
        </DashboardLayout>
    );
}

