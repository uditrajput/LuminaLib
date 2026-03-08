"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { getAppConfigByKey } from "@/services/appConfigService";
import { Button } from "@/components/ui/Button";
import { Clock, AlertTriangle } from "lucide-react";

const WARNING_DURATION_SECONDS = 60; // 60 seconds popup timer

export default function SessionManager() {
    const { isAuthenticated, logout } = useAuthContext();
    const [timeoutMinutes, setTimeoutMinutes] = useState<number>(15); // Default 15 min
    const [showWarning, setShowWarning] = useState<boolean>(false);
    const [secondsLeft, setSecondsLeft] = useState<number>(WARNING_DURATION_SECONDS);

    // Timers
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
    const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch config logic
    useEffect(() => {
        let isMounted = true;

        async function fetchConfig() {
            try {
                const config = await getAppConfigByKey("session_timeout_minutes");
                if (config && config.value && isMounted) {
                    const parsed = parseInt(config.value, 10);
                    if (!isNaN(parsed) && parsed > 0) {
                        setTimeoutMinutes(parsed);
                    }
                }
            } catch (error) {
                console.error("Failed to load session timeout config, using default (15m)", error);
            }
        }

        if (isAuthenticated) {
            fetchConfig();
        }

        return () => {
            isMounted = false;
        };
    }, [isAuthenticated]);

    // Cleanup function
    const clearTimers = useCallback(() => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    }, []);

    const resetIdleTimer = useCallback(() => {
        if (!isAuthenticated || showWarning) return; // Don't reset if warning is active or logged out

        clearTimers();

        // Calculate the time until we need to show the warning 
        // e.g., if timeout is 15 minutes, show warning at 14 minutes.
        const warningTimeMs = (timeoutMinutes * 60 - WARNING_DURATION_SECONDS) * 1000;

        // Ensure minimum reasonable time (e.g. if config manually set too low)
        const safeWarningTimeMs = Math.max(10000, warningTimeMs);

        idleTimerRef.current = setTimeout(() => {
            setShowWarning(true);
            setSecondsLeft(WARNING_DURATION_SECONDS);
        }, safeWarningTimeMs);
    }, [isAuthenticated, showWarning, timeoutMinutes, clearTimers]);

    // Handle user activity
    useEffect(() => {
        if (!isAuthenticated) {
            clearTimers();
            setShowWarning(false);
            return;
        }

        // Setup interaction listeners
        const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
        const handleActivity = () => {
            if (!showWarning) {
                resetIdleTimer();
            }
        };

        events.forEach(event => window.addEventListener(event, handleActivity));

        // Initial setup
        resetIdleTimer();

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            clearTimers();
        };
    }, [isAuthenticated, showWarning, resetIdleTimer, clearTimers]);

    // Countdown logic when warning is shown
    useEffect(() => {
        if (showWarning) {
            countdownTimerRef.current = setInterval(() => {
                setSecondsLeft((prev) => {
                    if (prev <= 1) {
                        // Time's up
                        clearTimers();
                        setShowWarning(false);
                        logout(); // Clears session and redirects to home/login
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current);
            }
        }

        return () => {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        };
    }, [showWarning, clearTimers, logout]);

    const handleContinue = () => {
        setShowWarning(false);
        resetIdleTimer();
        // Since we don't have a specific refresh token endpoint, simply closing the popup 
        // and letting their local token persist until natural expiration is sufficient.
    };

    const handleLogout = () => {
        clearTimers();
        setShowWarning(false);
        logout();
    };

    if (!showWarning) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 w-full max-w-md overflow-hidden flex flex-col transform transition-all">

                {/* Header Section */}
                <div className="p-6 pb-0 flex flex-col items-center text-center space-y-4">
                    <div className="h-16 w-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 rounded-full flex items-center justify-center shrink-0">
                        <AlertTriangle className="h-8 w-8" />
                    </div>

                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                        Session Expiring Soon
                    </h2>

                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        You have been inactive for a while. For your security, we will automatically log you out in:
                    </p>
                </div>

                {/* Timer Display */}
                <div className="p-6 flex justify-center">
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-700">
                        <Clock className="h-6 w-6 text-indigo-500" />
                        <span className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-wider font-mono">
                            {Math.floor(secondsLeft / 60).toString().padStart(2, '0')}:{(secondsLeft % 60).toString().padStart(2, '0')}
                        </span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="p-6 pt-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                    <Button
                        variant="ghost"
                        className="flex-1 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                        onClick={handleLogout}
                    >
                        Logout Now
                    </Button>
                    <Button
                        variant="default"
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
                        onClick={handleContinue}
                    >
                        Stay Logged In
                    </Button>
                </div>
            </div>
        </div>
    );
}
