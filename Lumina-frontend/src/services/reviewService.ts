import apiClient from "./apiClient";
import { Review, ReviewCreate, BorrowStatus, BookSummary } from "@/types/review";

// ── Reviews ──────────────────────────────────────────────────────────────────
export const getBookReviews = async (bookId: number): Promise<Review[]> => {
    const res = await apiClient.get<Review[]>(`/books/${bookId}/reviews`);
    return res.data;
};

export const addReview = async (bookId: number, data: ReviewCreate): Promise<Review> => {
    const res = await apiClient.post<Review>(`/books/${bookId}/reviews`, data);
    return res.data;
};

// ── Borrow / Return ───────────────────────────────────────────────────────────
export const borrowBook = async (bookId: number) => {
    const res = await apiClient.post(`/books/${bookId}/borrow`);
    return res.data;
};

export const returnBook = async (bookId: number) => {
    const res = await apiClient.post(`/books/${bookId}/return`);
    return res.data;
};

export const getBorrowStatus = async (bookId: number): Promise<BorrowStatus> => {
    const res = await apiClient.get<BorrowStatus>(`/books/${bookId}/borrow-status`);
    return res.data;
};

// ── Summary ───────────────────────────────────────────────────────────────────
export const getBookSummary = async (bookId: number): Promise<BookSummary> => {
    const res = await apiClient.get<BookSummary>(`/books/${bookId}/summary`);
    return res.data;
};
