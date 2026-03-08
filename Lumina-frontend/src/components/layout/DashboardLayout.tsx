"use client";

import React from "react";
import Navbar from "./Navbar";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    return (
        <div className="flex min-h-screen flex-col bg-[var(--background)]">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 py-8 md:px-6 md:py-12 text-[var(--foreground)]">
                {children}
            </main>
            <footer className="border-t border-[var(--border)] bg-[var(--card)] py-6">
                <div className="container mx-auto px-4 text-center text-sm text-[var(--foreground)] opacity-60">
                    &copy; {new Date().getFullYear()} LuminaLib. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
