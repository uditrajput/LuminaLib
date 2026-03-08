import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    listUsers, getUserById, getUserStats,
    adminCreateUser, adminUpdateUser, adminDeleteUser,
} from "@/services/userService";
import { AdminUserUpdate, UserCreate } from "@/types/user";

// ── Stats ─────────────────────────────────────────────────────────────────────

export const useUserStats = () =>
    useQuery({
        queryKey: ["admin", "users", "stats"],
        queryFn: getUserStats,
    });

// ── List (paginated + search + filter) ───────────────────────────────────────

export const useUserList = (params: {
    page: number;
    size: number;
    search?: string;
    role?: string;
}) =>
    useQuery({
        queryKey: ["admin", "users", params],
        queryFn: () => listUsers(params),
        placeholderData: (prev) => prev,
    });

// ── Single user ───────────────────────────────────────────────────────────────

export const useUserById = (id: number | null) =>
    useQuery({
        queryKey: ["admin", "users", id],
        queryFn: () => getUserById(id!),
        enabled: id !== null,
    });

// ── Create ────────────────────────────────────────────────────────────────────

export const useAdminCreateUser = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: UserCreate) => adminCreateUser(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin", "users"] });
        },
    });
};

// ── Update ────────────────────────────────────────────────────────────────────

export const useAdminUpdateUser = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: AdminUserUpdate }) =>
            adminUpdateUser(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin", "users"] });
        },
    });
};

// ── Delete ────────────────────────────────────────────────────────────────────

export const useAdminDeleteUser = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => adminDeleteUser(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin", "users"] });
        },
    });
};
