"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { quizService } from "@/services/quizService";

export default function GradingQueuePage() {
  const { id } = useParams<{ id: string }>();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  useEffect(()=>{ quizService.listAttempts(Number(id), filter || undefined).then(setAttempts).catch(()=>{}); }, [id, filter]);
  return (
    <DashboardLayout>
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">Grading Queue — Quiz {id}</h1>
      <div className="flex gap-2 mt-4">
        <button onClick={()=>setFilter("")} className={`px-3 py-1 rounded border ${filter===""?"bg-blue-600 text-white border-blue-600":"border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"}`}>All</button>
        <button onClick={()=>setFilter("pending_grading")} className={`px-3 py-1 rounded border ${filter==="pending_grading"?"bg-amber-500 text-white border-amber-500":"border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"}`}>Pending</button>
        <button onClick={()=>setFilter("graded")} className={`px-3 py-1 rounded border ${filter==="graded"?"bg-emerald-600 text-white border-emerald-600":"border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"}`}>Graded</button>
      </div>
      <div className="mt-4 space-y-2">
        {attempts.map((a:any)=>(
          <div key={a.id} className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl flex justify-between items-center bg-white dark:bg-slate-900">
            <span className="text-sm text-slate-700 dark:text-slate-300">Attempt #{a.id} • User {a.user_id} • {a.status} • {a.score ?? "-"} ({a.percentage ? Math.round(a.percentage)+"%" : "-"})</span>
            <a href={`/quizzes/${id}/attempts/${a.id}/grade`} className="text-blue-600 dark:text-blue-400 text-sm hover:underline">Grade →</a>
          </div>
        ))}
        {attempts.length===0 && <p className="text-sm text-slate-600 dark:text-slate-400">No attempts</p>}
      </div>
    </DashboardLayout>
  );
}
