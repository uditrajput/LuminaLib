"use client";

import React, { useEffect, useState } from "react";
import { 
    Users, BookOpen, Activity, ArrowUpRight, Clock, Shield, AlertTriangle, 
    RefreshCw, Sparkles, PlusCircle, Settings, CheckCircle2, UserCheck, 
    BrainCircuit, Eye, Bookmark, TrendingUp, Award
} from "lucide-react";
import Link from "next/link";
import { User } from "@/types/user";

interface AdminDashboardProps {
    user: User | null;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
    const [timeframe, setTimeframe] = useState<string>("30d");
    const [lastRefreshed, setLastRefreshed] = useState<string>("Just now");
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [analytics, setAnalytics] = useState<any>(null);
    const [showOnlineModal, setShowOnlineModal] = useState<boolean>(false);

    // Compute dynamic greeting based on current local hour
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    const fetchAnalytics = async () => {
        setRefreshing(true);
        try {
            const { default: apiClient } = await import("@/services/apiClient");
            const res = await apiClient.get("/admin/dashboard-analytics");
            if (res.data) {
                setAnalytics(res.data);
                const now = new Date();
                setLastRefreshed(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            }
        } catch (err) {
            console.error("Failed to load admin analytics", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const adminName = user?.full_name || "Admin";

    if (loading && !analytics) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <span className="text-sm font-semibold text-slate-500">Loading Command Center Telemetry…</span>
                </div>
            </div>
        );
    }

    const stats = analytics?.key_stats || {};
    const demographics = analytics?.demographics || { professions: {}, education: {}, popular_interests: [], popular_genres: [] };
    const popularBooks = analytics?.popular_books || [];
    const lowEngagementBooks = analytics?.low_engagement_books || [];
    const onlineUsersList = analytics?.online_users || [];
    const activityGraph = analytics?.activity_graph || [];
    const aiTelemetry = analytics?.ai_telemetry || { recommendation_requests: 0, books_recommended: 0, click_rate: 0, borrow_rate: 0, reading_rate: 0, completion_rate: 0, sources: {} };
    const libraryInsights = analytics?.library_insights || [];
    const attentionRequired = analytics?.attention_required || [];

    const totalProfessions = Object.values(demographics.professions as Record<string, number>).reduce((a, b) => a + b, 0) || 1;

    return (
        <div className="flex flex-col gap-8 pb-16 font-sans">
            {/* Header Section */}
            <div className="relative p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-2xl border border-white/10 overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold backdrop-blur-md mb-3">
                            <Shield className="h-3.5 w-3.5" /> Admin Command Center
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                            {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">{adminName}</span> 👋
                        </h1>
                        <p className="text-slate-300 text-sm mt-1">
                            Here's what's happening in your digital library today.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 px-4 py-2 rounded-2xl text-xs text-slate-200">
                            <Clock className="h-4 w-4 text-blue-400" />
                            <span>Last updated: <strong className="text-white">{lastRefreshed}</strong></span>
                            <button
                                onClick={fetchAnalytics}
                                disabled={refreshing}
                                className="ml-1 p-1 hover:bg-white/20 rounded-lg transition-all text-blue-300 hover:text-white"
                                title="Refresh Analytics"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {/* Global Timeframe Selector */}
                        <div className="flex bg-slate-800/80 p-1 rounded-2xl border border-slate-700/60 text-xs font-medium">
                            {[
                                { id: "today", label: "Today" },
                                { id: "7d", label: "7 Days" },
                                { id: "30d", label: "30 Days" },
                                { id: "1y", label: "1 Year" },
                            ].map((tf) => (
                                <button
                                    key={tf.id}
                                    onClick={() => setTimeframe(tf.id)}
                                    className={`px-3 py-1.5 rounded-xl transition-all ${
                                        timeframe === tf.id
                                            ? "bg-blue-600 text-white font-bold shadow"
                                            : "text-slate-400 hover:text-white"
                                    }`}
                                >
                                    {tf.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions Toolbar */}
            <div className="flex flex-wrap items-center gap-3 p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm text-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-2 mr-1">Quick Actions:</span>
                <Link
                    href="/books"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm hover:scale-[1.02] transition-all"
                >
                    <PlusCircle className="h-4 w-4" /> Add / Upload Book
                </Link>
                <Link
                    href="/admin/users"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/70 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all"
                >
                    <Users className="h-4 w-4 text-blue-500" /> Manage Users
                </Link>
                <Link
                    href="/admin/config"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/70 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all"
                >
                    <Settings className="h-4 w-4 text-purple-500" /> System Settings
                </Link>
                <a
                    href="#ai-telemetry"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/70 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all"
                >
                    <BrainCircuit className="h-4 w-4 text-amber-500" /> AI Telemetry
                </a>
            </div>

            {/* Attention Required Banner (if any) */}
            {attentionRequired.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Attention Required</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {attentionRequired.map((att: any) => (
                            <div key={att.id} className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${att.type === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400' : att.type === 'warning' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'}`}>
                                        <AlertTriangle className="h-4 w-4" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white">{att.label}</span>
                                </div>
                                <Link href={att.target} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0">
                                    {att.action} →
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Row 1: Key Performance Overview (8 Stat Cards Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

                {/* Card 1: Total Users */}
                <Link href="/admin/users" className="group p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-md hover:border-blue-500/40 transition-all relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Users</span>
                        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                            <Users className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                            {(stats.total_users || 0).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <ArrowUpRight className="h-4 w-4" /> {stats.growth_rate ?? 0}% growth
                        </div>
                    </div>
                </Link>

                {/* Card 2: Active Users */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Users</span>
                        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                            <UserCheck className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                            {(stats.active_users || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                            Status: <strong className="text-emerald-600 dark:text-emerald-400">ACTIVE</strong>
                        </div>
                    </div>
                </div>

                {/* Card 3: Users Online */}
                <div 
                    onClick={() => setShowOnlineModal(true)}
                    className="cursor-pointer group p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-md hover:border-emerald-500/40 transition-all relative overflow-hidden"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Users Online</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                            <Activity className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                            {stats.online_users || 0}
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">LIVE</span>
                        </div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium group-hover:underline">
                            Click to view active live sessions →
                        </div>
                    </div>
                </div>

                {/* Card 4: New Registrations */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">New Users</span>
                        <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                            +{stats.new_users_month || 0}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                            +{stats.new_users_week || 0} new accounts this week
                        </div>
                    </div>
                </div>

                {/* Card 5: Total Books */}
                <Link href="/books" className="group p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-md hover:border-indigo-500/40 transition-all relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Books</span>
                        <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                            <BookOpen className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                            {(stats.total_books || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                            Public: <strong className="text-slate-800 dark:text-slate-200">{stats.public_books || 0}</strong> · Private: <strong className="text-slate-800 dark:text-slate-200">{stats.private_books || 0}</strong>
                        </div>
                    </div>
                </Link>

                {/* Card 6: Books Borrowed */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Currently Borrowed</span>
                        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                            <Bookmark className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                            {(stats.currently_borrowed || 0).toLocaleString()}
                        </div>
                        {stats.overdue_borrows > 0 ? (
                            <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-red-600 dark:text-red-400">
                                <AlertTriangle className="h-3.5 w-3.5" /> {stats.overdue_borrows} overdue borrows
                            </div>
                        ) : (
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">All returns on schedule</div>
                        )}
                    </div>
                </div>

                {/* Card 7: Currently Reading */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Currently Reading</span>
                        <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                            <Eye className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                            {(stats.currently_reading || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                            Active borrowing sessions
                        </div>
                    </div>
                </div>

                {/* Card 8: Borrowed but Not Started */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Borrowed (Unread)</span>
                        <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                            <Clock className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                            {stats.borrowed_not_started || 0}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                            Returned borrowings count
                        </div>
                    </div>
                </div>

            </div>

            {/* Row 2: User Activity & Platform Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* User Activity Dynamic Chart */}
                <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Activity className="h-5 w-5 text-blue-500" /> Daily Activity & Registration Telemetry
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Calculated directly from daily database transactions</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span> Activity</span>
                            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> Registrations</span>
                        </div>
                    </div>

                    {/* Interactive Visual Activity Bar Graph */}
                    <div className="h-64 flex items-end justify-between gap-3 pt-6 px-2">
                        {activityGraph.map((item: any, idx: number) => (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                                <div className="w-full max-w-[42px] bg-slate-100 dark:bg-slate-700/50 rounded-xl overflow-hidden flex flex-col justify-end p-1 gap-1 h-full group-hover:bg-slate-200/60 dark:group-hover:bg-slate-700 transition-all">
                                    <div style={{ height: `${Math.min(100, (item.newUsers * 20) + 10)}%` }} className="w-full bg-emerald-500 rounded-md transition-all" title={`New Registrations: ${item.newUsers}`} />
                                    <div style={{ height: `${Math.min(100, (item.active * 15) + 15)}%` }} className="w-full bg-blue-500 rounded-md transition-all" title={`Activity: ${item.active}`} />
                                </div>
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.day}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Aggregated Demographics Insights */}
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-6">
                    <div className="border-b border-slate-100 dark:border-slate-700/60 pb-4">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Users className="h-5 w-5 text-indigo-500" /> User Profile Demographics
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Calculated live from active user profile records</p>
                    </div>

                    <div className="space-y-4">
                        {Object.entries(demographics.professions as Record<string, number>).map(([prof, count]) => {
                            const pct = Math.round((count / totalProfessions) * 100);
                            return (
                                <div key={prof}>
                                    <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        <span>{prof}</span>
                                        <span>{pct}% ({count})</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>

            {/* Row 3: Book Performance & Low Engagement Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Popular Books Ranking */}
                <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Award className="h-5 w-5 text-amber-500" /> Most Borrowed & Read Titles
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Live query of database borrow records</p>
                        </div>
                        <Link href="/books" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">View All Books →</Link>
                    </div>

                    <div className="space-y-4">
                        {popularBooks.length > 0 ? (
                            popularBooks.map((book: any, index: number) => (
                                <div key={index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:scale-[1.01] transition-all">
                                    <div className="flex items-center gap-4">
                                        <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 font-extrabold text-sm">
                                            #{book.rank || index + 1}
                                        </span>
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">{book.title}</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">By {book.author} · {book.genre}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 text-xs">
                                        <div className="text-right">
                                            <span className="font-extrabold text-slate-900 dark:text-white">{book.borrows}</span>
                                            <span className="text-slate-400 block text-[10px]">borrows</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{book.completion_rate}%</span>
                                            <span className="text-slate-400 block text-[10px]">completion</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-slate-400 text-center py-6">No borrowing data recorded yet.</p>
                        )}
                    </div>
                </div>

                {/* Low Engagement Warning */}
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-6 flex flex-col justify-between">
                    <div>
                        <div className="border-b border-slate-100 dark:border-slate-700/60 pb-4 mb-4">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-orange-500" /> Low Engagement Alert
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Titles requiring metadata or summary optimization</p>
                        </div>

                        {lowEngagementBooks.length > 0 ? (
                            lowEngagementBooks.map((item: any, idx: number) => (
                                <div key={idx} className="p-4 bg-orange-50/50 dark:bg-orange-950/20 rounded-2xl border border-orange-200/60 dark:border-orange-900/40 space-y-3 mb-3">
                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{item.title}</h3>
                                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                        <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-orange-100 dark:border-orange-900/20">
                                            <span className="font-bold text-slate-900 dark:text-white">{item.borrowed}</span>
                                            <span className="text-[10px] text-slate-400 block">Borrowed</span>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-orange-100 dark:border-orange-900/20">
                                            <span className="font-bold text-slate-900 dark:text-white">{item.started}</span>
                                            <span className="text-[10px] text-slate-400 block">Started</span>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-orange-100 dark:border-orange-900/20">
                                            <span className="font-bold text-orange-600 dark:text-orange-400">{item.completed}</span>
                                            <span className="text-[10px] text-slate-400 block">Finished</span>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed border border-orange-200/50 dark:border-orange-900/30 flex items-start gap-2">
                                        <Sparkles className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                                        <span>{item.ai_insight}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-slate-400 text-center py-6">All borrowed titles are currently meeting engagement targets.</p>
                        )}
                    </div>

                    <Link href="/books" className="w-full py-3 text-center rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition-all">
                        Optimize Book Metadata & Summaries
                    </Link>
                </div>

            </div>

            {/* Row 4: AI Recommendation Telemetry (AI Command Center) */}
            <div id="ai-telemetry" className="p-8 rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white border border-indigo-500/20 shadow-2xl space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-semibold mb-2">
                            <BrainCircuit className="h-3.5 w-3.5 text-indigo-400" /> Neural Engine Intelligence
                        </div>
                        <h2 className="text-2xl font-extrabold">AI Recommendation Telemetry & Performance</h2>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Model Latency: {analytics?.ai_health?.avg_response_ms || 14.5}ms ({analytics?.ai_health?.service_status === "Healthy" ? "Optimal" : "Active"})
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                    <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
                        <span className="text-xs text-slate-400 font-semibold uppercase">Total Requests</span>
                        <div className="text-2xl font-extrabold mt-1">{(aiTelemetry.recommendation_requests || 0).toLocaleString()}</div>
                    </div>
                    <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
                        <span className="text-xs text-slate-400 font-semibold uppercase">Click-Through Rate</span>
                        <div className="text-2xl font-extrabold text-blue-400 mt-1">{aiTelemetry.click_rate}%</div>
                    </div>
                    <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
                        <span className="text-xs text-slate-400 font-semibold uppercase">Borrow Conversion</span>
                        <div className="text-2xl font-extrabold text-emerald-400 mt-1">{aiTelemetry.borrow_rate}%</div>
                    </div>
                    <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
                        <span className="text-xs text-slate-400 font-semibold uppercase">Reading Completion</span>
                        <div className="text-2xl font-extrabold text-purple-400 mt-1">{aiTelemetry.completion_rate}%</div>
                    </div>
                </div>

                {/* Dynamic AI Platform Insights */}
                <div className="p-5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 space-y-3">
                    <h3 className="text-sm font-bold text-indigo-200 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-400" /> Dynamic AI Platform Insights
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                        {libraryInsights.map((insight: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10">
                                <span className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
                                <span>{insight}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Currently Online Users Modal */}
            {showOnlineModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 max-w-2xl w-full shadow-2xl space-y-4 animate-fade-in">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span> Currently Active Registered Users ({onlineUsersList.length})
                            </h3>
                            <button onClick={() => setShowOnlineModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-sm">✕</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 uppercase">
                                        <th className="py-2.5 px-3">User</th>
                                        <th className="py-2.5 px-3">Device / Browser</th>
                                        <th className="py-2.5 px-3">Last Active</th>
                                        <th className="py-2.5 px-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-slate-700 dark:text-slate-300">
                                    {onlineUsersList.map((usr: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                            <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                                                {usr.full_name}
                                                <span className="text-slate-400 block text-[10px] font-normal">{usr.email}</span>
                                            </td>
                                            <td className="py-3 px-3">{usr.device}</td>
                                            <td className="py-3 px-3">{usr.login_time}</td>
                                            <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">ACTIVE</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
