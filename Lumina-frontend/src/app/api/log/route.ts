import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { event, path, user, timestamp, metadata } = body;

        // Structured log object for Grafana parsing
        const logData = {
            activityType: "user_activity",
            event,
            path,
            user: user || "anonymous",
            clientTimestamp: timestamp,
            ...metadata
        };

        // Output to standard console. It will be intercepted by winston-loki in instrumentation.ts
        console.log(`[Frontend Activity Tracker] ${JSON.stringify(logData)}`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to parse activity log:", error);
        return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
    }
}
