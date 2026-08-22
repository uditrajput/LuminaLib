import React from "react";
import { UserDashboardMetrics } from "@/types/user";
import { Award, BookOpen, Flag } from "lucide-react";

interface ReadingJourneyProps {
    metrics: UserDashboardMetrics | null;
}

export default function ReadingJourney({ metrics }: ReadingJourneyProps) {
    if (!metrics) return null;

    const milestones = [
        {
            title: "First Book Borrowed",
            date: metrics.recent_returns.length > 0 ? new Date(metrics.recent_returns[metrics.recent_returns.length - 1].borrowed_at).toLocaleDateString() : "Just Started",
            icon: <Flag className="w-4 h-4 text-primary" />,
            completed: metrics.total_borrowed > 0
        },
        {
            title: "5 Books Read",
            date: metrics.returned >= 5 ? "Achieved" : `${5 - metrics.returned} more to go`,
            icon: <BookOpen className="w-4 h-4 text-blue-500" />,
            completed: metrics.returned >= 5
        },
        {
            title: "Reading Champion (10 Books)",
            date: metrics.returned >= 10 ? "Achieved" : `${10 - metrics.returned} more to go`,
            icon: <Award className="w-4 h-4 text-yellow-500" />,
            completed: metrics.returned >= 10
        }
    ];

    return (
        <div className="bg-[var(--card)] p-6 rounded-2xl shadow-sm border border-[var(--border)]">
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
