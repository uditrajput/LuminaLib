import React from "react";
import { UserDashboardMetrics } from "@/types/user";
import { Book, CheckCircle, Clock } from "lucide-react";

interface ReadingOverviewProps {
    metrics: UserDashboardMetrics | null;
}

export default function ReadingOverview({ metrics }: ReadingOverviewProps) {
    if (!metrics) return null;

    // A simple mock for "Waiting to Be Read" until backend tracking supports it perfectly
    const notStarted = Math.max(0, metrics.currently_borrowed - metrics.active_borrows.length); 

    const cards = [
        {
            title: "Total Books Borrowed",
            value: metrics.total_borrowed,
            subtitle: "Books borrowed so far",
            icon: <Book className="w-6 h-6 text-blue-500" />,
            bgColor: "bg-blue-500/10",
            hoverClass: "hover:shadow-blue-500/20 hover:-translate-y-1"
        },
        {
            title: "Books Returned",
            value: metrics.returned,
            subtitle: "Successfully completed",
            icon: <CheckCircle className="w-6 h-6 text-green-500" />,
            bgColor: "bg-green-500/10",
            hoverClass: "hover:shadow-green-500/20 hover:-translate-y-1"
        },
        {
            title: "Waiting to Be Read",
            value: notStarted,
            subtitle: "Borrowed but not started",
            icon: <Clock className="w-6 h-6 text-orange-500" />,
            bgColor: "bg-orange-500/10",
            hoverClass: "hover:shadow-orange-500/20 hover:-translate-y-1"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((card, i) => (
                <div 
                    key={i} 
                    className={`
                        bg-[var(--card)] p-6 rounded-2xl shadow-sm border border-[var(--border)]
                        transition-all duration-300 transform cursor-pointer relative overflow-hidden
                        ${card.hoverClass}
                    `}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-xl ${card.bgColor}`}>
                            {card.icon}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-sm font-medium text-muted-foreground">{card.title}</h3>
                        <div className="text-4xl font-bold tracking-tight">
                            {card.value}
                        </div>
                        <p className="text-xs text-muted-foreground pt-2">{card.subtitle}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
