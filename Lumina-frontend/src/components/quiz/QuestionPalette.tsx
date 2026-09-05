"use client";
export function QuestionPalette({ total, current, answers, flagged, onJump }: { total: number; current: number; answers: Record<number, any>; flagged: Record<number, boolean>; onJump: (i: number) => void; }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {Array.from({ length: total }, (_, i) => {
        const answered = !!answers[i];
        const isFlagged = !!flagged[i];
        const isCurrent = i === current;
        return (
          <button
            key={i}
            onClick={() => onJump(i)}
            className={`h-10 w-10 rounded-xl text-sm font-medium border flex items-center justify-center relative transition-all
              ${isCurrent ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : ""}
              ${!isCurrent && answered ? "bg-emerald-500 text-white border-emerald-500 dark:border-emerald-600" : ""}
              ${!isCurrent && !answered && !isFlagged ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700" : ""}
              ${isFlagged ? "bg-amber-400 text-white border-amber-500" : ""}`}
          >
            {i + 1}
            {isFlagged && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-amber-600 rounded-full border-2 border-white" />}
          </button>
        );
      })}
    </div>
  );
}
