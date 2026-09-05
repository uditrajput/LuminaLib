"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { quizService } from "@/services/quizService";
import { useAppDialog } from "@/components/ui/AppDialog";

export default function GradePage() {
  const { id, attemptId } = useParams<{ id: string; attemptId: string }>();
  const { showAlert } = useAppDialog();
  const [data, setData] = useState<any>(null);
  const [grades, setGrades] = useState<Record<number, { score: number; feedback: string }>>({});
  useEffect(()=>{ quizService.result(Number(attemptId)).then(d=>{ setData(d); const m: any={}; (d.questions||[]).forEach((q:any)=>{ if(q.type==="descriptive" && q.score==null) m[q.question_id]={score:0,feedback:""}; }); setGrades(m); }); }, [attemptId]);
  const aiSuggest = async (qid:number)=>{
    const res = await quizService.aiGrade(Number(attemptId), qid);
    setGrades(g=>({...g, [qid]:{score: res.suggested_score, feedback: res.justification}}));
    showAlert(`AI suggests ${res.suggested_score}: ${res.justification}`, { title: "AI Suggestion", variant: "info" });
  };
  const submit = async ()=>{
    const payload = Object.entries(grades).map(([qid,v])=>({ question_id:Number(qid), score:v.score, feedback:v.feedback }));
    await quizService.grade(Number(attemptId), payload);
    showAlert("Graded successfully", { title: "Success", variant: "success" });
    location.reload();
  };
  if (!data) return <DashboardLayout><div className="text-center py-12 text-slate-600 dark:text-slate-400">Loading...</div></DashboardLayout>;
  return (
    <DashboardLayout>
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">Grade Attempt #{attemptId} — Quiz {id}</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">Score {data.score}/{data.max_score} • {data.status}</p>
      <div className="mt-6 space-y-4">
        {(data.questions||[]).filter((q:any)=>q.type==="descriptive").map((q:any)=>(
          <div key={q.question_id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900">
            <p className="font-medium whitespace-pre-wrap text-slate-900 dark:text-white">{q.prompt}</p>
            <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded text-sm whitespace-pre-wrap text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">{q.your_answer?.descriptive_text || "— no answer —"}</div>
            {q.rubric && <div className="text-xs mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-amber-800 dark:text-amber-300">Rubric: {q.rubric}</div>}
            <div className="mt-3 flex gap-2 items-center">
              <input type="number" value={grades[q.question_id]?.score ?? ""} onChange={e=>setGrades(g=>({...g,[q.question_id]:{...g[q.question_id], score:Number(e.target.value)}}))} placeholder={`0–${q.marks}`} className="w-24 p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
              <span className="text-xs text-slate-600 dark:text-slate-400">/ {q.marks}</span>
              <button onClick={()=>aiSuggest(q.question_id)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs">AI Suggest</button>
            </div>
            <textarea value={grades[q.question_id]?.feedback || ""} onChange={e=>setGrades(g=>({...g,[q.question_id]:{...g[q.question_id], feedback:e.target.value}}))} placeholder="Feedback" rows={2} className="w-full mt-2 p-2 border border-slate-200 dark:border-slate-700 rounded text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400" />
            {q.score!=null && <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">Already graded: {q.score}</p>}
          </div>
        ))}
        {Object.keys(grades).length>0 && <button onClick={submit} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">Submit Grades</button>}
      </div>
    </DashboardLayout>
  );
}
