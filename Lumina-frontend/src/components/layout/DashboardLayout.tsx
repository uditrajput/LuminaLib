"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Navbar from "./Navbar";
import { LeftSidebar } from "./LeftSidebar";
import { useAuth } from "@/hooks/useAuth";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

const PUBLIC_PATHS = ["/login", "/signup", "/auth/verify-email"];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { isAuthenticated, isLoading } = useAuth();

    const isPublicPage = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"));
    const isQA = pathname === "/qa" || pathname.startsWith("/qa/");
    const isAuthPage = pathname === "/login" || pathname === "/signup";
    const showSidebar = isAuthenticated && !isAuthPage;

    // Session guard: if accessing protected page without auth, redirect to login
    useEffect(() => {
        if (!isLoading && !isAuthenticated && !isPublicPage) {
            router.replace("/login");
        }
    }, [isLoading, isAuthenticated, isPublicPage, router]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem("luminalib_sidebar_collapsed");
            if (saved) setCollapsed(saved === "true");
        } catch {}
    }, []);

    const toggle = () => {
        setCollapsed(v => {
            const nv = !v;
            try { localStorage.setItem("luminalib_sidebar_collapsed", String(nv)); } catch {}
            return nv;
        });
    };

    // If protected page is loading or not authenticated, show full-screen verification loader
    if (!isPublicPage && (isLoading || !isAuthenticated)) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-[var(--background)]">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Checking session…</span>
                </div>
            </div>
        );
    }

    // QA & Auth: fit inner window, hide outer scrollbar
    if (isQA || isAuthPage) {
        return (
            <div className="flex h-screen flex-col overflow-hidden bg-[var(--background)]">
                <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-indigo-600 text-white px-3 py-1 rounded z-[100]">Skip to content</a>
                <Navbar />
                <div className="flex flex-1 min-h-0 overflow-hidden">
                    {showSidebar && <LeftSidebar collapsed={collapsed} onToggle={toggle} />}
                    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                        <main id="main" className={`flex-1 flex flex-col overflow-hidden text-[var(--foreground)] ${isAuthPage ? "p-2 md:p-3 items-center justify-center overflow-y-auto" : "p-2 md:p-3"}`}>
                            {children}
                        </main>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-[var(--background)]">
            <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-indigo-600 text-white px-3 py-1 rounded z-[100]">Skip to content</a>
            <Navbar />
            <div className="flex flex-1 min-h-0">
                {showSidebar && <LeftSidebar collapsed={collapsed} onToggle={toggle} />}
                <div className="flex-1 flex flex-col min-w-0">
                    <main id="main" className="flex-1 w-full px-4 py-6 md:px-6 lg:px-8 text-[var(--foreground)]">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}

