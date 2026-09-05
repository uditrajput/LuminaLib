"use client";
export function Timer({ remaining }: { remaining: number | null }) {
  if (remaining === null) return <div className="text-sm text-muted-foreground">—</div>;
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const low = remaining < 300;
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-lg ${low ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 animate-pulse" : "bg-slate-900 dark:bg-slate-800 text-white border border-slate-700"}`}>
      <span>⏱</span>
      <span>{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</span>
    </div>
  );
}
