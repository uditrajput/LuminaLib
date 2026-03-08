import apiClient from "./apiClient";
import { User, UserUpdate, PasswordChange, AdminUserUpdate, UserCreate, PaginatedUserResponse, UserStats } from "@/types/user";
import { UserPreference, UserPreferencesUpdate } from "@/types/preference";

// ── Self profile ──────────────────────────────────────────────────────────────
export const getMyProfile = async (): Promise<User> => {
    const response = await apiClient.get<User>("/users/me");
    return response.data;
};

export const updateMyProfile = async (data: UserUpdate): Promise<User> => {
    const response = await apiClient.put<User>("/users/me", data);
    return response.data;
};

export const changePassword = async (data: PasswordChange): Promise<User> => {
    const response = await apiClient.put<User>("/auth/change-password", data);
    return response.data;
};

// ── Admin — user management ───────────────────────────────────────────────────
export const getUserStats = async (): Promise<UserStats> => {
    const response = await apiClient.get<UserStats>("/users/stats");
    return response.data;
};

export const listUsers = async (params: {
    page?: number;
    size?: number;
    search?: string;
    role?: string;
}): Promise<PaginatedUserResponse> => {
    const response = await apiClient.get<PaginatedUserResponse>("/users", { params });
    return response.data;
};

export const getUserById = async (id: number): Promise<User> => {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data;
};

export const adminCreateUser = async (data: UserCreate): Promise<User> => {
    const response = await apiClient.post<User>("/users", data);
    return response.data;
};

export const adminUpdateUser = async (id: number, data: AdminUserUpdate): Promise<User> => {
    const response = await apiClient.put<User>(`/users/${id}`, data);
    return response.data;
};

export const adminDeleteUser = async (id: number): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
};

// ── Preferences ───────────────────────────────────────────────────────────────
export const getUserPreferences = async (): Promise<UserPreference> => {
    const response = await apiClient.get<UserPreference>("/users/me/preferences");
    return response.data;
};

export const updateUserPreferences = async (data: UserPreferencesUpdate): Promise<UserPreference> => {
    const response = await apiClient.put<UserPreference>("/users/me/preferences", data);
    return response.data;
};


