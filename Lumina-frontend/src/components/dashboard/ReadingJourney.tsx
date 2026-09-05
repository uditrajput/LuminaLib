import React, { useEffect, useState } from "react";
import { UserDashboardMetrics } from "@/types/user";
import { Award, BookOpen, Flag, Flame, Star, Trophy } from "lucide-react";
import apiClient from "@/services/apiClient";

interface ReadingJourneyProps {
    metrics: UserDashboardMetrics | null;
}

export default function ReadingJourney({ metrics }: ReadingJourneyProps) {
    const [stats, setStats] = useState<any>(null);
    useEffect(() => {
        apiClient.get("/progress/stats").then(r => setStats(r.data)).catch(() => {});
    }, []);
    if (!metrics && !stats) return null;

    const returned = metrics?.returned ?? stats?.returned ?? 0;
    const milestones = [
        {
            title: "First Book Borrowed",
            date: metrics?.recent_returns?.length ? new Date(metrics.recent_returns[metrics.recent_returns.length - 1].borrowed_at).toLocaleDateString() : stats?.total_sessions ? "Started" : "Just Started",
            icon: <Flag className="w-4 h-4 text-primary" />,
            completed: (metrics?.total_borrowed ?? stats?.total_sessions ?? 0) > 0
        },
        {
            title: "5 Books Read",
            date: returned >= 5 ? "Achieved" : `${5 - returned} more to go`,
            icon: <BookOpen className="w-4 h-4 text-blue-500" />,
            completed: returned >= 5
        },
        {
            title: "Reading Champion (10 Books)",
            date: returned >= 10 ? "Achieved" : `${10 - returned} more to go`,
            icon: <Award className="w-4 h-4 text-yellow-500" />,
            completed: returned >= 10
        }
    ];

    return (
        <div className="bg-[var(--card)] p-6 rounded-2xl shadow-sm border border-[var(--border)]">
            {stats && (
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 text-center">
                        <Flame className="h-5 w-5 mx-auto text-orange-500" />
                        <p className="text-lg font-bold">{stats.streak_days}</p>
                        <p className="text-xs text-muted-foreground">Day Streak</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 text-center">
                        <Star className="h-5 w-5 mx-auto text-indigo-500" />
                        <p className="text-lg font-bold">{stats.xp} XP</p>
                        <p className="text-xs text-muted-foreground">Level {stats.level}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 text-center">
                        <Trophy className="h-5 w-5 mx-auto text-emerald-500" />
                        <p className="text-lg font-bold">{Math.floor((stats.total_time_seconds||0)/60)}m</p>
                        <p className="text-xs text-muted-foreground">Read Time</p>
                    </div>
                </div>
            )}
            {stats?.badges?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                    {stats.badges.map((b:string) => <span key={b} className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">{b}</span>)}
                </div>
            )}
            <h2 className="text-xl font-bold mb-6">Your Reading Journey</h2>
            
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[1.125rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[var(--border)] before:to-transparent">
                {milestones.map((milestone, index) => (
                    <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className={`flex items-center justify-center w-9 h-9 rounded-full border-4 border-[var(--card)] ${milestone.completed ? 'bg-[var(--background)] shadow-sm' : 'bg-[var(--muted)] text-muted-foreground'} shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm`}>
                            {milestone.icon}
                        </div>
                        
                        <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-[var(--border)] ${milestone.completed ? 'bg-[var(--background)] shadow-sm' : 'bg-transparent opacity-60'}`}>
                            <div className="flex items-center justify-between space-x-2 mb-1">
                                <h3 className={`font-bold ${milestone.completed ? '' : 'text-muted-foreground'}`}>{milestone.title}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">{milestone.date}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
