import React from "react";
import { TrendingUp, Clock, Activity } from "lucide-react";

export default function ReadingAnalytics() {
    // Generate some slightly varied mock data for the visual
    const data = [
        { day: "Mon", minutes: 45 },
        { day: "Tue", minutes: 30 },
        { day: "Wed", minutes: 65 },
        { day: "Thu", minutes: 40 },
        { day: "Fri", minutes: 90 },
        { day: "Sat", minutes: 120 },
        { day: "Sun", minutes: 85 },
    ];

    const maxMinutes = Math.max(...data.map(d => d.minutes));

    return (
        <div className="bg-gradient-to-br from-[var(--card)] to-[var(--background)] p-6 md:p-8 rounded-3xl shadow-sm border border-[var(--border)] group/card hover:shadow-md transition-shadow relative overflow-hidden">
            {/* Background decorative blob */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 relative z-10 gap-4">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                        <Activity className="w-5 h-5 text-blue-500" /> 
                        Reading Time
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1.5">Your reading activity over the past 7 days</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm border border-emerald-100 dark:border-emerald-500/20">
                    <TrendingUp className="w-3.5 h-3.5" />
                    You read 20% more this week!
                </div>
            </div>

            {/* Simple CSS Chart */}
            <div className="h-56 flex items-end gap-2 sm:gap-4 lg:gap-8 justify-between mt-4 border-b border-slate-200 dark:border-slate-800 pb-2 relative z-10">
                {/* Horizontal grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-slate-400 w-8 text-right">{maxMinutes}m</span>
                        <div className="border-t border-dashed border-slate-200 dark:border-slate-800 w-full" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-slate-400 w-8 text-right">{Math.round(maxMinutes/2)}m</span>
                        <div className="border-t border-dashed border-slate-200 dark:border-slate-800 w-full" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-slate-400 w-8 text-right">0m</span>
                        <div className="border-t border-solid border-slate-200 dark:border-slate-800 w-full" />
                    </div>
                </div>
                
                {data.map((item, index) => {
                    // Adding minimum 5% height so very small values are still visible
                    const heightPercent = Math.max((item.minutes / maxMinutes) * 100, 5); 
                    const isWeekend = item.day === 'Sat' || item.day === 'Sun';
                    return (
                        <div key={index} className="flex flex-col items-center flex-1 group z-10 pl-10">
                            <div className="relative w-full max-w-[48px] flex justify-center h-full items-end">
                                {/* Tooltip */}
                                <div className="opacity-0 group-hover:opacity-100 absolute -top-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs py-1.5 px-2.5 rounded-lg font-bold shadow-xl whitespace-nowrap transition-all transform translate-y-2 group-hover:translate-y-0 pointer-events-none z-20">
                                    {item.minutes} min
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 dark:bg-white rotate-45" />
                                </div>
                                {/* Bar */}
                                <div 
                                    className={`w-full transition-all duration-500 ease-out rounded-t-xl group-hover:opacity-100 ${
                                        isWeekend 
                                        ? 'bg-blue-400 dark:bg-blue-500 opacity-90' 
                                        : 'bg-indigo-400 dark:bg-indigo-500 opacity-70'
                                    }`}
                                    style={{ height: `${heightPercent}%` }}
                                >
                                    <div className="w-full h-full bg-gradient-to-b from-white/20 to-transparent rounded-t-xl" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* X-Axis labels */}
            <div className="flex items-center justify-between mt-4 px-2 text-xs font-semibold z-10 relative">
                {data.map((item, index) => {
                    const isWeekend = item.day === 'Sat' || item.day === 'Sun';
                    return (
                        <div 
                            key={index} 
                            className={`flex-1 text-center pl-10 ${
                                isWeekend ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500 dark:text-slate-400'
                            }`}
                        >
                            {item.day}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
