"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useRecommendations } from "@/hooks/useRecommendations";
import { BookCard } from "@/components/books/BookCard";
import { Sparkles, RefreshCw, AlertCircle, Library } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function RecommendationsPage() {
    const [limit, setLimit] = useState(8);
    const { data: recommendations, isLoading, isError, error, refetch } = useRecommendations(limit);

    return (
        <DashboardLayout>
            <div className="flex flex-col space-y-8 max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 p-8 rounded-3xl shadow-md text-white">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
                            <Sparkles className="h-8 w-8 text-yellow-300" />
                            For You
                        </h1>
                        <p className="text-blue-100 max-w-xl text-sm leading-relaxed">
                            Our AI engine has analyzed your preferences and calculated the best possible matches for your reading journey. Discover your next favorite book below.
                        </p>
                    </div>
                    <Button
                        onClick={() => refetch()}
                        variant="outline"
                        className="gap-2 bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-full shadow-sm backdrop-blur-sm transition-all"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>

                <div className="pt-4">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3">Top Picks</h2>
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
                            {[...Array(limit)].map((_, i) => (
                                <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 h-80 flex flex-col">
                                    <div className="h-48 bg-gray-200 rounded-t-2xl"></div>
                                    <div className="p-5 flex-1 space-y-3">
                                        <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : isError ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-red-100 shadow-sm text-center">
                            <div className="p-4 bg-red-50 text-red-500 rounded-full mb-4">
                                <AlertCircle className="h-8 w-8" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Could not compute recommendations</h3>
                            <p className="text-gray-500 mb-6 max-w-md">
                                {error instanceof Error ? error.message : "Ensure your profile preferences are set up correctly."}
                            </p>
                            <Button onClick={() => refetch()} variant="outline" className="gap-2">
                                <RefreshCw className="h-4 w-4" /> Try Again
                            </Button>
                        </div>
                    ) : !recommendations || recommendations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-3xl border border-gray-100 shadow-sm text-center">
                            <div className="p-4 bg-gray-50 text-gray-400 rounded-full mb-4">
                                <Library className="h-10 w-10" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">No recommendations ready yet</h3>
                            <p className="text-gray-500 max-w-sm mb-6">We need to learn more about your reading habits. Try adjusting your preferences in your profile.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {recommendations.map((book) => (
                                <BookCard key={book.id} book={book} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
