import apiClient from "./apiClient";
import { Book, BookCreate } from "@/types/book";

export interface BookListResponse {
    items: Book[];
    total: number;
    page: number;
    size: number;
}

export const getBooks = async (page = 1, size = 20, q = ""): Promise<BookListResponse> => {
    let url = `/books?page=${page}&size=${size}`;
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
