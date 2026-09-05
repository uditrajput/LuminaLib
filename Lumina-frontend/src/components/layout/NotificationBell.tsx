"use client";
import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import apiClient from "@/services/apiClient";

import Link from "next/link";

export function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  const fetch = async () => {
    try {
      const res = await apiClient.get("/notifications");
      const list = Array.isArray(res.data) ? res.data : [];
      setItems(list.slice(0, 8));
      setCount(list.filter((n: any) => !n.read).length);
    } catch {}
  };
  useEffect(() => { fetch(); const id = setInterval(fetch, 30000); return () => clearInterval(id); }, []);

  const markAll = async () => {
    await apiClient.post("/notifications/read-all").catch(()=>{});
    fetch();
  };

  const handleItemClick = async (n: any) => {
    if (!n.read) {
      await apiClient.post(`/notifications/${n.id}/read`).catch(() => {});
      fetch();
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">
        <Bell className="h-5 w-5" />
        {count > 0 && <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-xs">{count > 9 ? "9+" : count}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in">
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">Notifications</span>
            <button
              onClick={markAll}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-800 transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-auto divide-y divide-slate-100 dark:divide-slate-800">
            {items.length === 0 ? <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-8">No notifications</p> :
              items.map(n => {
                const content = (
                  <div className={`p-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer ${!n.read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}>
                    <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs">{n.title}</p>
                    {n.body && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{n.body}</p>}
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                );

                if (n.link) {
                  return (
                    <Link key={n.id} href={n.link} onClick={() => handleItemClick(n)}>
                      {content}
                    </Link>
                  );
                }

                return (
                  <div key={n.id} onClick={() => handleItemClick(n)}>
                    {content}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
