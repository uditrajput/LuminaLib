import apiClient from "./apiClient";
import { Book, BookCreate } from "@/types/book";

export interface BookListResponse {
    items: Book[];
    total: number;
    page: number;
    size: number;
}

export const getBooks = async (page = 1, size = 20, q = "", catalog = "public"): Promise<BookListResponse> => {
    let url = `/books?page=${page}&size=${size}&catalog=${encodeURIComponent(catalog)}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    const res = await apiClient.get<BookListResponse>(url);
    return res.data;
};

export const getBookById = async (id: string | number): Promise<Book> => {
    const res = await apiClient.get<Book>(`/books/${id}`);
    return res.data;
};

export const createBook = async (data: BookCreate): Promise<Book> => {
    const res = await apiClient.post<Book>("/books", data);
    return res.data;
};

export const updateBook = async (id: number | string, data: FormData | any): Promise<Book> => {
    const isFormData = data instanceof FormData;
    const res = await apiClient.put<Book>(`/books/${id}`, data, {
        headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
    });
    return res.data;
};

export const deleteBook = async (id: number): Promise<void> => {
    await apiClient.delete(`/books/${id}`);
};

export interface PublicBookStats {
    books_count: number;
    summaries_count: number;
    rating: string;
}

export const getPublicBookStats = async (): Promise<PublicBookStats> => {
    const res = await apiClient.get<PublicBookStats>("/books/public/stats");
    return res.data;
};

export const getRecommendations = async (limit: number = 5): Promise<Book[]> => {
    const res = await apiClient.get<Book[]>(`/recommendations?limit=${limit}`);
    return res.data;
};

