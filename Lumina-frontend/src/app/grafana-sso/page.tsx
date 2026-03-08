"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function GrafanaSSO() {
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            // Set cookie so Next.js middleware can read it and authenticate the user to Grafana
            document.cookie = `lumina_token=${token}; path=/; max-age=3600;`;
            window.location.href = "/grafana/dashboards";
        } else {
            router.push("/login");
        }
    }, [router]);

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center gap-4 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="font-medium animate-pulse">Authenticating with Telemetry Dashboard...</p>
        </div>
    );
}
