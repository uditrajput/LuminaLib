"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  Sparkles, Brain, Library, Users, Settings, Activity, FileQuestion, Shield, ChevronLeft, ChevronRight, User, LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const mainLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Sparkles },
  { href: "/books", label: "Library", icon: Library },
  { href: "/recommendations", label: "For You", icon: Sparkles },
  { href: "/quizzes", label: "Quizzes", icon: FileQuestion },
  { href: "/qa", label: "AI Q&A", icon: Brain },
];

const adminLinks = [
  { href: "/admin/quizzes", label: "Quizzes Admin", icon: FileQuestion },
  { href: "/admin/users", label: "Manage Users", icon: Users },
  { href: "/admin/config", label: "App Settings", icon: Settings },
  { href: "/grafana-sso", label: "Grafana", icon: Activity },
];

export function LeftSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const isQuizAttempt = pathname.startsWith("/quizzes/") && pathname.includes("/attempt/");
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const isAdmin = user?.role === "admin";
  const filteredAdmin = isAdmin ? adminLinks : [];
  const [hasAssignedQuizzes, setHasAssignedQuizzes] = useState(false);
  const isTeacher = (user as any)?.role === "teacher";

  useEffect(() => {
    if (!user) { setHasAssignedQuizzes(false); return; }
    if (isAdmin || isTeacher) { setHasAssignedQuizzes(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("@/services/quizService");
        const list = await mod.quizService.list("assigned");
        if (!cancelled) setHasAssignedQuizzes(Array.isArray(list) ? list.length > 0 : false);
      } catch { if (!cancelled) setHasAssignedQuizzes(false); }
    })();
    return () => { cancelled = true; };
  }, [user, pathname]);

  const visibleMainLinks = mainLinks.filter(l => {
    if (l.href === "/quizzes" && !hasAssignedQuizzes) return false;
    return true;
  });

  return (
    <aside className={cn(
      "hidden lg:flex flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0 sticky top-16 h-[calc(100vh-4rem)] transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Toggle */}
      <div className="flex items-center justify-between p-2 border-b border-slate-200 dark:border-slate-700">
        {!collapsed && <span className="text-xs font-bold text-slate-500 dark:text-slate-400 px-2 flex items-center gap-2"><Shield className="h-4 w-4" /> {isAdmin ? "Admin Menu" : "Menu"}</span>}
        <button
          onClick={onToggle}
          disabled={isQuizAttempt}
          className={cn(
            "p-2 rounded-xl text-slate-600 dark:text-slate-400 ml-auto transition-all",
            isQuizAttempt
              ? "opacity-40 blur-[0.6px] pointer-events-none cursor-not-allowed"
              : "hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          )}
          aria-label={collapsed ? "Expand menu" : "Collapse menu"}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 space-y-4">
        <div className="space-y-1 px-2">
          {!collapsed && <p className="px-2 text-[11px] font-bold tracking-widest text-slate-400 uppercase">Main</p>}
          {visibleMainLinks.map(link => {
            const Icon = link.icon;
            const active = isActive(link.href);
            if (isQuizAttempt) {
              return (
                <div
                  key={link.href}
                  title="Quiz in progress"
                  className={cn(
                    "flex items-center gap-3 rounded-xl transition-all opacity-40 blur-[0.6px] pointer-events-none cursor-not-allowed select-none",
                    collapsed ? "justify-center p-3" : "px-3 py-2.5",
                    active ? "bg-blue-600/70 text-white shadow-sm" : "text-slate-600 dark:text-slate-400"
                  )}
                >
                  <Icon className={cn(collapsed ? "h-6 w-6" : "h-4 w-4", "shrink-0")} />
                  {!collapsed && <span className="text-sm font-medium whitespace-nowrap">{link.label}</span>}
                </div>
              );
            }
            return (
              <Link
                key={link.href}
                href={link.href}
                title={collapsed ? link.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl transition-all",
                  collapsed ? "justify-center p-3" : "px-3 py-2.5",
                  active ? "bg-blue-600 text-white shadow-sm" : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <Icon className={cn(collapsed ? "h-6 w-6" : "h-4 w-4", "shrink-0")} />
                {!collapsed && <span className="text-sm font-medium whitespace-nowrap">{link.label}</span>}
              </Link>
            );
          })}
        </div>

        {filteredAdmin.length > 0 && (
          <div className="space-y-1 px-2">
            {!collapsed && <p className="px-2 text-[11px] font-bold tracking-widest text-slate-400 uppercase">Admin</p>}
            {collapsed && <div className="mx-2 h-px bg-slate-200 dark:bg-slate-700" />}
            {filteredAdmin.map(link => {
              const Icon = link.icon;
              const active = isActive(link.href);
              if (isQuizAttempt) {
                return (
                  <div
                    key={link.href}
                    title="Quiz in progress"
                    className={cn(
                      "flex items-center gap-3 rounded-xl transition-all opacity-40 blur-[0.6px] pointer-events-none cursor-not-allowed select-none",
                      collapsed ? "justify-center p-3" : "px-3 py-2.5",
                      active ? "bg-blue-600/70 text-white shadow-sm" : "text-slate-600 dark:text-slate-400"
                    )}
                  >
                    <Icon className={cn(collapsed ? "h-6 w-6" : "h-4 w-4", "shrink-0")} />
                    {!collapsed && <span className="text-sm font-medium whitespace-nowrap">{link.label}</span>}
                  </div>
                );
              }
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  title={collapsed ? link.label : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl transition-all",
                    collapsed ? "justify-center p-3" : "px-3 py-2.5",
                    active ? "bg-blue-600 text-white shadow-sm" : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <Icon className={cn(collapsed ? "h-6 w-6" : "h-4 w-4", "shrink-0")} />
                  {!collapsed && <span className="text-sm font-medium whitespace-nowrap">{link.label}</span>}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      <div className="p-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
        {isAuthenticated && (
          <>
            {isQuizAttempt ? (
              <div
                title="Quiz in progress"
                className={cn(
                  "flex items-center gap-3 rounded-xl transition-all opacity-40 blur-[0.6px] pointer-events-none cursor-not-allowed select-none",
                  collapsed ? "justify-center p-3" : "px-3 py-2.5",
                  "text-slate-600 dark:text-slate-400"
                )}
              >
                <div className={cn("rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0 overflow-hidden ring-1 ring-white/20", collapsed ? "h-8 w-8 text-sm" : "h-7 w-7 text-xs")}>
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    ((user?.full_name ?? user?.email ?? "U")[0]).toUpperCase()
                  )}
                </div>
                {!collapsed && <span className="text-sm font-medium whitespace-nowrap truncate max-w-[120px]">{user?.full_name || user?.email?.split("@")[0] || "User Profile"}</span>}
                {!collapsed && <User className="h-3.5 w-3.5 ml-auto opacity-60" />}
              </div>
            ) : (
              <Link
                href="/profile"
                title={collapsed ? (user?.full_name || user?.email || "User Profile") : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl transition-all",
                  collapsed ? "justify-center p-3" : "px-3 py-2.5",
                  isActive("/profile") ? "bg-blue-600 text-white shadow-sm" : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <div className={cn("rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0 overflow-hidden ring-1 ring-white/20", collapsed ? "h-8 w-8 text-sm" : "h-7 w-7 text-xs")}>
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    ((user?.full_name ?? user?.email ?? "U")[0]).toUpperCase()
                  )}
                </div>
                {!collapsed && <span className="text-sm font-medium whitespace-nowrap truncate max-w-[120px]">{user?.full_name || user?.email?.split("@")[0] || "User Profile"}</span>}
                {!collapsed && <User className="h-3.5 w-3.5 ml-auto opacity-60" />}
              </Link>
            )}
            <button
              onClick={logout}
              title={collapsed ? "Logout" : undefined}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl transition-all cursor-pointer",
                collapsed ? "justify-center p-3" : "px-3 py-2.5",
                "text-slate-700 dark:text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold"
              )}
            >
              <LogOut className={cn(collapsed ? "h-6 w-6" : "h-4 w-4", "shrink-0 text-red-500")} />
              {!collapsed && <span className="text-sm font-medium whitespace-nowrap">Logout</span>}
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
