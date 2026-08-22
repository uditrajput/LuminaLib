import React from "react";
import { User } from "@/types/user";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface DashboardHeaderProps {
    user: User | null;
}

export default function DashboardHeader({ user }: DashboardHeaderProps) {
    if (!user) return null;

    const isProfileComplete = user.profile_completed;

    const currentHour = new Date().getHours();
    let greeting = "Good Evening";
    if (currentHour < 12) greeting = "Good Morning";
    else if (currentHour < 18) greeting = "Good Afternoon";

    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--card)] p-6 rounded-2xl shadow-sm border border-[var(--border)] relative overflow-hidden">
            {/* Background subtle gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
            
            <div className="flex items-center gap-4 z-10">
                <div className="relative">
                    {user.avatar_url ? (
                        <img 
                            src={user.avatar_url} 
                            alt="Profile" 
                            className="w-16 h-16 rounded-full object-cover border-2 border-[var(--background)] shadow-sm"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold border-2 border-[var(--background)] shadow-sm">
                            {user.full_name?.charAt(0) || user.email.charAt(0)}
                        </div>
                    )}
                </div>
                <div>
                    <h1 className="text-2xl font-bold">{greeting}, {user.full_name?.split(" ")[0] || "Reader"} 👋</h1>
                    <p className="text-sm text-muted-foreground mt-1">Ready to discover something interesting today?</p>
                </div>
            </div>

            {!isProfileComplete && (
                <div className="z-10">
                    <div className="flex items-center gap-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 px-3 py-1.5 rounded-full text-xs font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Complete profile to improve AI recommendations</span>
                        <Link href="/profile" className="underline ml-1 hover:text-yellow-700 dark:hover:text-yellow-400">
                            Complete Now
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
