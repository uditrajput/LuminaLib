"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import SessionManager from "@/components/layout/SessionManager";
import ActivityTracker from "@/components/layout/ActivityTracker";

export default function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <AuthProvider>
                    {children}
                    <SessionManager />
                    <ActivityTracker />
                </AuthProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
}
