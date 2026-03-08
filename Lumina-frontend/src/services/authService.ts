import apiClient from "./apiClient";
import { User, Token } from "@/types/user";

// Backend uses POST /auth/login with JSON body { email, password }
export const loginUser = async (email: string, password: string): Promise<string> => {
    const response = await apiClient.post<Token>("/auth/login", { email, password });
    return response.data.access_token;
};

// Backend uses POST /auth/signup with JSON body { email, password, role? }
export const registerUser = async (data: { email: string; password: string; full_name?: string }): Promise<User> => {
    const response = await apiClient.post<User>("/auth/signup", data);
    return response.data;
};

export const getCurrentUser = async (): Promise<User> => {
    const response = await apiClient.get<User>("/auth/profile");
    return response.data;
};
