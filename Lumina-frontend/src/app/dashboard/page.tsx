"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ReadingOverview from "@/components/dashboard/ReadingOverview";
import NewBooksSection from "@/components/dashboard/NewBooksSection";
import CurrentlyReading from "@/components/dashboard/CurrentlyReading";
import ReadingAnalytics from "@/components/dashboard/ReadingAnalytics";
import AIRecommendations from "@/components/dashboard/AIRecommendations";
import DidYouKnow from "@/components/dashboard/DidYouKnow";
import ReadingJourney from "@/components/dashboard/ReadingJourney";
import GroupLibrariesSection from "@/components/dashboard/GroupLibrariesSection";
import AdminDashboard from "@/components/dashboard/admin/AdminDashboard";
import { getDashboardMetrics } from "@/services/userService";
import { UserDashboardMetrics } from "@/types/user";

export default function DashboardPage() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const [metrics, setMetrics] = useState<UserDashboardMetrics | null>(null);
    const [metricsLoading, setMetricsLoading] = useState(true);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isLoading, isAuthenticated, router]);

    useEffect(() => {
        if (isAuthenticated && user?.role !== "admin") {
            getDashboardMetrics()
                .then(setMetrics)
                .catch(console.error)
                .finally(() => setMetricsLoading(false));
        } else if (isAuthenticated && user?.role === "admin") {
            setMetricsLoading(false);
        }
    }, [isAuthenticated, user?.role]);

    if (isLoading || !isAuthenticated || (user?.role !== "admin" && metricsLoading)) {
        return (
            <DashboardLayout>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </DashboardLayout>
        );
    }

    const isAdmin = user?.role === "admin";

    return (
        <DashboardLayout>
            {isAdmin ? (
                <AdminDashboard user={user} />
            ) : (
                <div className="flex flex-col gap-10 pb-12">
                    <DashboardHeader user={user} />
                    <DidYouKnow />
                    
                    {metrics && metrics.active_borrows.length > 0 && (
                        <CurrentlyReading activeBorrow={metrics.active_borrows[0]} />
                    )}

                    <ReadingOverview metrics={metrics} />
                    <ReadingAnalytics />
                    <GroupLibrariesSection />
                    <NewBooksSection />
                    <AIRecommendations user={user} />
                    <ReadingJourney metrics={metrics} />
                </div>
            )}
        </DashboardLayout>
    );
}
