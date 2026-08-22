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

export interface ChatMessage {
    id: number | string;
    session_id?: number;
    role: "user" | "assistant";
    content: string;
    excerpts?: SourceExcerpt[];
    is_saved?: boolean;
    created_at?: string;
    error?: boolean;
}

export interface ChatSession {
    id: number;
    user_id: number;
    title: string;
    created_at: string;
    updated_at: string;
    message_count?: number;
    last_message?: string;
}

export interface ChatSessionDetail extends ChatSession {
    messages: ChatMessage[];
}

export const askQuestion = async (question: string): Promise<QAResponse> => {
    const res = await apiClient.post<QAResponse>("/qa", { question });
    return res.data;
};

export const getChatSessions = async (): Promise<ChatSession[]> => {
    const res = await apiClient.get<ChatSession[]>("/qa/sessions");
    return res.data;
};

export const createChatSession = async (title?: string): Promise<ChatSessionDetail> => {
    const res = await apiClient.post<ChatSessionDetail>("/qa/sessions", { title });
    return res.data;
};

export const getSessionDetail = async (sessionId: number): Promise<ChatSessionDetail> => {
    const res = await apiClient.get<ChatSessionDetail>(`/qa/sessions/${sessionId}`);
    return res.data;
};

export const renameChatSession = async (sessionId: number, title: string): Promise<ChatSession> => {
    const res = await apiClient.put<ChatSession>(`/qa/sessions/${sessionId}`, { title });
    return res.data;
};

export const deleteChatSession = async (sessionId: number): Promise<void> => {
    await apiClient.delete(`/qa/sessions/${sessionId}`);
};

export const askQuestionInSession = async (sessionId: number, question: string): Promise<QAResponse> => {
    const res = await apiClient.post<QAResponse>(`/qa/sessions/${sessionId}/ask`, { question });
    return res.data;
};

export const toggleSaveMessage = async (messageId: number): Promise<ChatMessage> => {
    const res = await apiClient.post<ChatMessage>(`/qa/messages/${messageId}/save`);
    return res.data;
};
