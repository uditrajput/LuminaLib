"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User } from "@/types/user";
import { getCurrentUser } from "@/services/authService";

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    loginAt: number | null;
    login: (token: string) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loginAt, setLoginAt] = useState<number | null>(() => {
        if (typeof window !== "undefined") {
            const v = localStorage.getItem("loginAt");
            return v ? Number(v) : null;
        }
        return null;
    });

    const loadUser = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            setIsLoading(false);
            return;
        }

        try {
            const userData = await getCurrentUser();
            setUser(userData);
            // ensure loginAt exists for existing session
            const stored = localStorage.getItem("loginAt");
            if (!stored) {
                const now = Date.now();
                localStorage.setItem("loginAt", String(now));
                setLoginAt(now);
            } else if (!loginAt) {
                setLoginAt(Number(stored));
            }
        } catch (error) {
            console.error("Failed to authenticate user", error);
            localStorage.removeItem("token");
            localStorage.removeItem("loginAt");
            setLoginAt(null);
        } finally {
            setIsLoading(false);
        }
    }, [loginAt]);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    useEffect(() => {
        if (!user) return;
        // Periodic heartbeat ping every 45s while authenticated
        const pingInterval = setInterval(async () => {
            try {
                const { default: apiClient } = await import("@/services/apiClient");
                await apiClient.post("/auth/ping").catch(() => {});
            } catch {}
        }, 45000);

        return () => clearInterval(pingInterval);
    }, [user]);

    const login = (token: string) => {
        localStorage.setItem("token", token);
        const now = Date.now();
        localStorage.setItem("loginAt", String(now));
        setLoginAt(now);
        loadUser();
    };

    const logout = async () => {
        try {
            const { default: apiClient } = await import("@/services/apiClient");
            await apiClient.post("/auth/logout").catch(() => {});
        } catch {}
        localStorage.removeItem("token");
        localStorage.removeItem("loginAt");
        setLoginAt(null);
        setUser(null);
        window.location.href = "/login";
    };

    const refreshUser = async () => {
        await loadUser();
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, loginAt, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuthContext must be used within an AuthProvider");
    }
    return context;
};

