import apiClient from "./apiClient";
import { Book } from "@/types/book";

export const getRecommendations = async (limit: number = 5, bookId?: number): Promise<Book[]> => {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    if (bookId) {
        params.append("book_id", bookId.toString());
    }

    const response = await apiClient.get<Book[]>(`/recommendations?${params.toString()}`);
    return response.data;
};
