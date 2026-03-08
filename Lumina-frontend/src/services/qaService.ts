import apiClient from "./apiClient";

export interface QARequest {
    question: string;
}

export interface SourceExcerpt {
    content: string;
    book_title?: string;
}

export interface QAResponse {
    answer: string;
    excerpts: SourceExcerpt[];
}

export const askQuestion = async (question: string): Promise<QAResponse> => {
    const res = await apiClient.post<QAResponse>("/qa", { question });
    return res.data;
};
