"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { quizService } from "@/services/quizService";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Power, Clock } from "lucide-react";
import { useAppDialog } from "@/components/ui/AppDialog";

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const router = useRouter();
  const { showAlert, showConfirmAsync } = useAppDialog();
  const refresh = () => quizService.list("manage").then(setQuizzes).catch(()=>{});
  useEffect(() => { refresh(); }, []);

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    try {
      await quizService.toggleStatus(id);
      showAlert(`Quiz status changed to ${currentStatus === "published" ? "disabled" : "published"}`, { title: "Status Updated", variant: "success" });
      refresh();
    } catch (e: any) {
      showAlert(e?.response?.data?.detail || e?.message || "Failed to update status", { title: "Error", variant: "error" });
    }
  };

  const handleDelete = async (id: number, title: string) => {
    const ok = await showConfirmAsync(`Delete quiz "${title}"? This will archive if attempts exist, otherwise permanently delete.`, { title: "Delete Quiz", variant: "danger", confirmText: "Delete", cancelText: "Cancel" });
    if (!ok) return;
    try {
      await quizService.delete(id);
      showAlert(`Quiz "${title}" deleted`, { title: "Deleted", variant: "success" });
      refresh();
    } catch (e: any) {
      showAlert(e?.response?.data?.detail || e?.message || "Delete failed", { title: "Error", variant: "error" });
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manage Quizzes</h1>
        <Link href="/quizzes/create" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-xs">+ New Quiz</Link>
      </div>
      <div className="overflow-auto border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-left">
            <tr>
              <th className="p-3 text-slate-700 dark:text-slate-300">Title</th>
              <th className="p-3 text-slate-700 dark:text-slate-300">Status</th>
              <th className="p-3 text-slate-700 dark:text-slate-300">Schedule</th>
              <th className="p-3 text-slate-700 dark:text-slate-300">Qs</th>
              <th className="p-3 text-slate-700 dark:text-slate-300">Marks</th>
              <th className="p-3 text-slate-700 dark:text-slate-300">Groups</th>
              <th className="p-3 text-slate-700 dark:text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {quizzes.map((q: any) => {
              const isPastSchedule = q.available_until && new Date(q.available_until) < new Date();
              const isEffectiveDisabled = q.status === "disabled" || isPastSchedule;
              const isArchived = q.status === "archived";

              return (
                <tr key={q.id} className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="p-3 font-medium text-slate-900 dark:text-white">
                    {q.title}
                    {q.description && <span className="block text-xs text-slate-400 font-normal line-clamp-1">{q.description}</span>}
                  </td>
                  <td className="p-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      isArchived
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600"
                        : isPastSchedule
                        ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                        : q.status === "published" || q.status === "enabled"
                        ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                        : q.status === "scheduled"
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                        : q.status === "draft"
                        ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                        : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                    }`}>
                      {isArchived ? "archived" : isPastSchedule ? "expired" : q.status === "published" ? "active" : q.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-500 dark:text-slate-400">
                    {q.available_from || q.available_until ? (
                      <div className="space-y-0.5" title={`From: ${q.available_from ? new Date(q.available_from).toLocaleString() : 'Immediate'} | Until: ${q.available_until ? new Date(q.available_until).toLocaleString() : 'No expiry'}`}>
                        {q.available_from && (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                            Start: {new Date(q.available_from).toLocaleDateString()} {new Date(q.available_from).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {q.available_until && (
                          <span className="flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400">
                            End: {new Date(q.available_until).toLocaleDateString()} {new Date(q.available_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">Always active</span>
                    )}
                  </td>
                  <td className="p-3 text-slate-700 dark:text-slate-300">{q.total_questions}</td>
                  <td className="p-3 text-slate-700 dark:text-slate-300">{q.total_marks}</td>
                  <td className="p-3 text-slate-700 dark:text-slate-300">{q.group_ids?.length || 0}</td>
                  <td className="p-3 flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => !isArchived && handleToggleStatus(q.id, q.status)}
                      disabled={isArchived}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        isArchived
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700 opacity-60"
                          : q.status === "published" || q.status === "enabled"
                          ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800"
                          : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800"
                      }`}
                      title={isArchived ? "Archived quizzes cannot be toggled directly. Edit quiz to change status." : q.status === "published" ? "Click to Disable quiz" : "Click to Enable quiz"}
                    >
                      <Power className="h-3 w-3" />
                      {q.status === "published" || q.status === "enabled" ? "Disable" : "Enable"}
                    </button>
                    <Link href={`/quizzes/${q.id}`} className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs">View</Link>
                    <Link href={`/quizzes/${q.id}/attempts`} className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs">Attempts</Link>
                    <Link href={`/quizzes/${q.id}/edit`} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-xs font-semibold"><Pencil className="h-3 w-3" /> Edit</Link>
                    <button
                      onClick={() => !isArchived && handleDelete(q.id, q.title)}
                      disabled={isArchived}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition ${
                        isArchived
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700 opacity-60"
                          : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800"
                      }`}
                      title={isArchived ? "Quiz is already archived" : "Delete quiz"}
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {quizzes.length === 0 && <p className="text-center py-8 text-slate-600 dark:text-slate-400">No quizzes yet</p>}
      </div>
    </DashboardLayout>
  );
}
