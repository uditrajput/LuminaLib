"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
    BookOpen, User, LogOut, LogIn, Sparkles, Brain, Library,
    Menu, X, Users, Settings, Activity, FileQuestion, Clock
} from "lucide-react";
import { Button } from "../ui/Button";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "../ui/ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { LangToggle } from "../ui/LangToggle";

type NavLink = {
    href: string;
    label: string;
    icon: React.ElementType;
    public: boolean;
    adminOnly?: boolean;
};

const mainLinks: NavLink[] = [
    { href: "/dashboard", label: "Dashboard", icon: Sparkles, public: false },
    { href: "/books", label: "Library", icon: Library, public: false },
    { href: "/recommendations", label: "For You", icon: Sparkles, public: false },
    { href: "/quizzes", label: "Quizzes", icon: FileQuestion, public: false },
    { href: "/qa", label: "AI Q&A", icon: Brain, public: false },
];

const adminLinks: NavLink[] = [
    { href: "/admin/quizzes", label: "Quizzes Admin", icon: FileQuestion, public: false, adminOnly: true },
    { href: "/admin/users", label: "Manage Users", icon: Users, public: false, adminOnly: true },
    { href: "/admin/config", label: "App Settings", icon: Settings, public: false, adminOnly: true },
    { href: "/grafana-sso", label: "Grafana", icon: Activity, public: false, adminOnly: true },
];

export default function Navbar() {
    const { user, isAuthenticated, logout, loginAt } = useAuth() as any;
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [hasAssignedQuizzes, setHasAssignedQuizzes] = useState(false);
    const [elapsed, setElapsed] = useState(0);

    const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

    // Quizzes visible for admin/teacher always, for student only when has assigned quizzes
    useEffect(() => {
        if (!isAuthenticated) { setHasAssignedQuizzes(false); return; }
        const role = (user as any)?.role;
        if (role === "admin" || role === "teacher") { setHasAssignedQuizzes(true); return; }
        let cancelled = false;
        (async () => {
            try {
                const mod = await import("@/services/quizService");
                const list = await mod.quizService.list("assigned");
                if (!cancelled) setHasAssignedQuizzes(Array.isArray(list) ? list.length > 0 : false);
            } catch { if (!cancelled) setHasAssignedQuizzes(false); }
        })();
        return () => { cancelled = true; };
    }, [isAuthenticated, user, pathname]);

    useEffect(() => {
        if (!isAuthenticated || !loginAt) { setElapsed(0); return; }
        const update = () => setElapsed(Math.floor((Date.now() - loginAt) / 1000));
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [isAuthenticated, loginAt]);

    const formatElapsed = (sec: number) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
        return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    const isQuizAttempt = pathname.startsWith("/quizzes/") && pathname.includes("/attempt/");

    const filteredMain = mainLinks.filter(l => {
        if (!l.public && !isAuthenticated) return false;
        if (l.href === "/quizzes" && !hasAssignedQuizzes) return false;
        return l.public || isAuthenticated;
    });
    const filteredAdmin = adminLinks.filter(l => !l.adminOnly || user?.role === "admin");

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-sm">
            <div className="w-full flex h-16 items-center justify-between px-4 lg:px-6 xl:px-8 gap-2">
                {/* Logo - shrink-0 */}
                {isQuizAttempt ? (
                    <div className="flex items-center gap-2 group shrink-0 opacity-40 blur-[0.6px] pointer-events-none cursor-not-allowed select-none" title="Quiz in progress">
                        <div className="p-1.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-sm">
                            <BookOpen className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-base lg:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                            Lumina<span className="text-blue-600">Lib</span>
                        </span>
                    </div>
                ) : (
                    <Link href={isAuthenticated ? "/dashboard" : "/login"} className="flex items-center gap-2 group shrink-0">
                        <div className="p-1.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                            <BookOpen className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-base lg:text-lg font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                            Lumina<span className="text-blue-600">Lib</span>
                        </span>
                    </Link>
                )}

                {/* Spacer - navigation moved to left sidebar on desktop */}
                <div className="hidden lg:block flex-1" />

                {/* Right - shrink-0, compact */}
                <div className="hidden lg:flex items-center gap-1.5 xl:gap-2 shrink-0">
                    <div className={cn(isQuizAttempt && "opacity-40 blur-[0.6px] pointer-events-none cursor-not-allowed select-none")}>
                        <LangToggle />
                    </div>
                    {/* Dark Mode toggle is ALWAYS enabled */}
                    <ThemeToggle />
                    {isAuthenticated && (
                        <div className={cn(isQuizAttempt && "opacity-40 blur-[0.6px] pointer-events-none cursor-not-allowed select-none")}>
                            <NotificationBell />
                        </div>
                    )}
                    {isAuthenticated ? (
                        <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium whitespace-nowrap text-slate-700 dark:text-slate-300", isQuizAttempt && "opacity-80")} title="Session time since login">
                            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="font-mono font-bold">{formatElapsed(elapsed)}</span>
                            <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400">• Logged in</span>
                        </div>
                    ) : (
                        <>
                            <Link href="/login">
                                <Button variant="ghost" size="sm" className="rounded-full">Log in</Button>
                            </Link>
                            <Link href="/signup">
                                <Button size="sm" className="rounded-full gap-1.5">
                                    <LogIn className="h-4 w-4" />
                                    Sign up
                                </Button>
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile */}
                <div className="flex lg:hidden items-center gap-1.5 shrink-0">
                    <div className={cn(isQuizAttempt && "opacity-40 blur-[0.6px] pointer-events-none cursor-not-allowed select-none")}>
                        <LangToggle />
                    </div>
                    {/* Dark Mode toggle is ALWAYS enabled */}
                    <ThemeToggle />
                    {isAuthenticated && (
                        <div className={cn(isQuizAttempt && "opacity-40 blur-[0.6px] pointer-events-none cursor-not-allowed select-none")}>
                            <NotificationBell />
                        </div>
                    )}
                    {!isQuizAttempt && (
                        <button
                            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => setMobileOpen(v => !v)}
                            aria-label="Menu"
                        >
                            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileOpen && (
                <div className="lg:hidden border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 pb-4 pt-2">
                    <div className="flex flex-col gap-1 mb-3">
                        {[...filteredMain, ...filteredAdmin].map((link) => {
                            const Icon = link.icon;
                            const active = isActive(link.href);
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                                        active ? "bg-blue-600 text-white" : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {link.label}
                                </Link>
                            );
                        })}
                    </div>
                    {isAuthenticated ? (
                        <div className="flex flex-col gap-2 border-t border-slate-200 dark:border-slate-700 pt-3">
                            <Link href="/profile" onClick={() => setMobileOpen(false)} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium", isActive("/profile") ? "bg-blue-600 text-white" : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800")}>
                                <User className="h-4 w-4" />
                                Profile
                            </Link>
                            <button onClick={() => { logout(); setMobileOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                <LogOut className="h-4 w-4" />
                                Logout
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 border-t border-slate-200 dark:border-slate-700 pt-3">
                            <Link href="/login" onClick={() => setMobileOpen(false)}>
                                <Button variant="outline" className="w-full rounded-full">Log in</Button>
                            </Link>
                            <Link href="/signup" onClick={() => setMobileOpen(false)}>
                                <Button className="w-full rounded-full">Sign up</Button>
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </nav>
    );
}
