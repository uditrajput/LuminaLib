"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { quizService } from "@/services/quizService";

export function useQuizTimer(attemptId: number | null, expiresAt: string | null, onExpire: () => void) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const sync = useCallback(async () => {
    if (!attemptId) return;
    try {
      const data = await quizService.getTime(attemptId);
      setRemaining(data.remaining_seconds);
      if (data.remaining_seconds <= 0) onExpireRef.current();
    } catch {}
  }, [attemptId]);

  useEffect(() => {
    if (!expiresAt || !attemptId) return;
    const calc = () => {
      const exp = new Date(expiresAt).getTime();
      const now = Date.now();
      const r = Math.max(0, Math.floor((exp - now) / 1000));
      setRemaining(r);
      if (r <= 0) onExpireRef.current();
    };
    calc();
    intervalRef.current = setInterval(calc, 1000);
    const onVis = () => { if (document.visibilityState === "visible") sync(); };
    document.addEventListener("visibilitychange", onVis);
    const syncInt = setInterval(sync, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(syncInt);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [expiresAt, attemptId, sync]);

  return remaining;
}
