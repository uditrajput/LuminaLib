"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
    BookOpen, User, LogOut, LogIn, Sparkles, Brain, Library,
    Menu, X, Home, Users, Settings, Activity
} from "lucide-react";
import { Button } from "../ui/Button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "../ui/ThemeToggle";

type NavLink = {
    href: string;
    label: string;
    icon: React.ElementType;
    public: boolean;
    adminOnly?: boolean;
    external?: boolean;
};

const navLinks: NavLink[] = [
    { href: "/", label: "Home", icon: Home, public: true },
    { href: "/books", label: "Library", icon: Library, public: true },
    { href: "/recommendations", label: "For You", icon: Sparkles, public: false },
    { href: "/qa", label: "AI Q&A", icon: Brain, public: false },
    { href: "/admin/users", label: "Manage Users", icon: Users, public: false, adminOnly: true },
    { href: "/admin/config", label: "App Settings", icon: Settings, public: false, adminOnly: true },
    { href: "/grafana-sso", label: "Grafana", icon: Activity, public: false, adminOnly: true, external: false },
];

export default function Navbar() {
    const { user, isAuthenticated, logout } = useAuth();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    const links = navLinks.filter((l) => {
        if (l.adminOnly && user?.role !== "admin") return false;
        return l.public || isAuthenticated;
    });

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-xl shadow-sm">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5 group">
                    <div className="p-1.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-sm group-hover:shadow-blue-200 transition-shadow">
                        <BookOpen className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-lg font-bold tracking-tight text-[var(--foreground)] group-hover:text-blue-600 transition-colors">
                        Lumina<span className="text-blue-600">Lib</span>
                    </span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-1">
                    {links.map((link) => {
                        const Icon = link.icon;
                        const active = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                target={link.external ? "_blank" : undefined}
                                rel={link.external ? "noopener noreferrer" : undefined}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                                    active
                                        ? "bg-blue-50/10 text-blue-500"
                                        : "text-[var(--foreground)] opacity-70 hover:opacity-100 hover:bg-blue-500/10"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {link.label}
                            </Link>
                        );
                    })}
                </div>

                {/* Auth buttons */}
                <div className="hidden md:flex items-center gap-3">
                    <ThemeToggle />
                    {isAuthenticated ? (
                        <>
                            <Link
                                href="/profile"
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all",
                                    pathname === "/profile"
                                        ? "bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400"
                                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}
                            >
                                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                    {((user?.full_name ?? user?.email ?? "U")[0]).toUpperCase()}
                                </div>
                                <span className="hidden lg:block max-w-[120px] truncate">{user?.full_name || user?.email}</span>
                            </Link>
                            <button
                                onClick={logout}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all"
                            >
                                <LogOut className="h-4 w-4" />
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link href="/login">
                                <Button variant="ghost" size="sm">Log in</Button>
                            </Link>
                            <Link href="/signup">
                                <Button size="sm" className="rounded-xl gap-1.5 shadow-sm shadow-blue-200">
                                    <LogIn className="h-4 w-4" />
                                    Sign up
                                </Button>
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile actions */}
                <div className="flex md:hidden items-center gap-2">
                    <ThemeToggle />
                    <button
                        className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        onClick={() => setMobileOpen((v) => !v)}
                    >
                        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileOpen && (
                <div className="md:hidden border-t border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-xl px-4 pb-4 pt-2 animate-fade-in">
                    <div className="flex flex-col gap-1 mb-4">
                        {links.map((link) => {
                            const Icon = link.icon;
                            const active = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    target={link.external ? "_blank" : undefined}
                                    rel={link.external ? "noopener noreferrer" : undefined}
                                    onClick={() => setMobileOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                                        active ? "bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {link.label}
                                </Link>
                            );
                        })}
                    </div>
                    {isAuthenticated ? (
                        <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                            <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                <User className="h-4 w-4" />
                                Profile
                            </Link>
                            <button onClick={() => { logout(); setMobileOpen(false); }} className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-500">
                                <LogOut className="h-4 w-4" />
                                Logout
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                            <Link href="/login" onClick={() => setMobileOpen(false)}>
                                <Button variant="outline" className="w-full">Log in</Button>
                            </Link>
                            <Link href="/signup" onClick={() => setMobileOpen(false)}>
                                <Button className="w-full">Sign up</Button>
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </nav>
    );
}
