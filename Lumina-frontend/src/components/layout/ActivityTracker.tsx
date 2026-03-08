"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function ActivityTracker() {
    const pathname = usePathname();
    const { user } = useAuth();
    const isInitialMount = useRef(true);

    useEffect(() => {
        const sendActivityLog = async (eventLabel: string) => {
            try {
                await fetch("/api/log", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        event: eventLabel,
                        path: pathname,
                        user: user?.email || "anonymous",
                        timestamp: new Date().toISOString(),
                    }),
                });
            } catch (err) {
                // Silently fail to avoid console cluttering on user side
            }
        };

        if (isInitialMount.current) {
            isInitialMount.current = false;
            sendActivityLog("page_load");
        } else {
            sendActivityLog("page_navigation");
        }

    }, [pathname, user]);

    return null; // Component does not render anything visually
}
