"use client";

import React, { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import {
    useUserStats, useUserList, useAdminCreateUser,
    useAdminUpdateUser, useAdminDeleteUser,
} from "@/hooks/useAdminUsers";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { User, AdminUserUpdate } from "@/types/user";
import {
    Users, Search, Shield, Plus, Trash2, Edit3, X, CheckCircle2,
    AlertCircle, ChevronLeft, ChevronRight, UserCheck, UserX,
    RefreshCw, Mail, Key, Tag, FileText, Crown, Eye, EyeOff,
    Lock, Unlock,
} from "lucide-react";

// ── Schemas ───────────────────────────────────────────────────────────────────

const createSchema = z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Min 8 characters"),
    full_name: z.string().optional(),
    role: z.enum(["user", "admin"]),
    bio: z.string().optional(),
    is_active: z.boolean().optional(),
});

const editSchema = z.object({
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    full_name: z.string().optional(),
    bio: z.string().optional(),
    role: z.enum(["user", "admin"]),
    is_active: z.boolean().optional(),
    new_password: z.string().min(8).optional().or(z.literal("")),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

// ── Small helpers ─────────────────────────────────────────────────────────────

function Avatar({ user, size = "md" }: { user: User; size?: "sm" | "md" }) {
    const initials = ((user.full_name || user.email)[0] ?? "U").toUpperCase();
    const sz = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
    return (
        <div className={`${sz} rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0 overflow-hidden`}>
            {user.avatar_url
                ? <img src={user.avatar_url} alt={user.full_name || user.email} className="h-full w-full object-cover" />
                : initials}
        </div>
    );
}

function RoleBadge({ role }: { role: string }) {
    return role === "admin" ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
            <Crown className="h-3 w-3" /> Admin
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            <Users className="h-3 w-3" /> User
        </span>
    );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
    return isActive ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" /> Active
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
            <Lock className="h-3 w-3" /> Blocked
        </span>
    );
}

function StatusAlert({ type, msg }: { type: "success" | "error"; msg: string }) {
    return (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm border animate-fade-in ${type === "success"
            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
            : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"}`}>
            {type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            {msg}
        </div>
    );
}

function FormField({ label, icon, error, hint, children }: {
    label: string; icon?: React.ReactNode; error?: string; hint?: string; children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                {icon}{label}
            </label>
            {children}
            {error && <p className="text-xs text-red-500">{error}</p>}
            {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
        </div>
    );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, gradient, sub }: {
    label: string; value: number | string; icon: React.ReactNode; gradient: string; sub?: string;
}) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${gradient}`}>
                {icon}
            </div>
            <div>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">{value}</p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
                {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[140px]">{sub}</p>}
            </div>
        </div>
    );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteModal({ user, onConfirm, onCancel, isPending }: {
    user: User; onConfirm: () => void; onCancel: () => void; isPending: boolean;
}) {
    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-100 dark:border-slate-700 animate-fade-in">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <Trash2 className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100">Delete User</h3>
                        <p className="text-xs text-slate-500">This action cannot be undone.</p>
                    </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                    Are you sure you want to delete <strong className="text-slate-900 dark:text-slate-100">{user.full_name || user.email}</strong>? All their data will be permanently removed.
                </p>
                <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={onCancel} disabled={isPending}>Cancel</Button>
                    <Button onClick={onConfirm} disabled={isPending} className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white border-0">
                        {isPending ? "Deleting…" : "Delete"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ── Edit/Create Modal ─────────────────────────────────────────────────────────

function UserModal({ mode, user, onClose, onSuccess }: {
    mode: "create" | "edit";
    user?: User;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [showPwd, setShowPwd] = useState(false);
    const create = useAdminCreateUser();
    const update = useAdminUpdateUser();
    const isPending = create.isPending || update.isPending;

    const { register: regC, handleSubmit: handleC, formState: { errors: errC } } =
        useForm<CreateForm>({ resolver: zodResolver(createSchema), defaultValues: { role: "user", bio: "Student", is_active: true } });

    const { register: regE, handleSubmit: handleE, formState: { errors: errE }, setValue: setEV } =
        useForm<EditForm>({ resolver: zodResolver(editSchema) });

    useEffect(() => {
        if (mode === "edit" && user) {
            setEV("email", user.email);
            setEV("full_name", user.full_name || "");
            setEV("bio", user.bio || "");
            setEV("role", user.role as "user" | "admin");
            setEV("is_active", user.is_active ?? true);
            setEV("new_password", "");
        }
    }, [mode, user, setEV]);

    const submitCreate = (data: CreateForm) => {
        create.mutate(data, { onSuccess });
    };

    const submitEdit = (data: EditForm) => {
        if (!user) return;
        const payload: AdminUserUpdate = {};
        if (data.email) payload.email = data.email;
        if (data.full_name !== undefined) payload.full_name = data.full_name;
        if (data.bio !== undefined) payload.bio = data.bio;
        if (data.role) payload.role = data.role;
        if (data.is_active !== undefined) payload.is_active = data.is_active;
        if (data.new_password) payload.new_password = data.new_password;
        update.mutate({ id: Number(user.id), data: payload }, { onSuccess });
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 dark:border-slate-700 animate-fade-in overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${mode === "create" ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600" : "bg-amber-50 dark:bg-amber-900/30 text-amber-500"}`}>
                            {mode === "create" ? <Plus className="h-5 w-5" /> : <Edit3 className="h-5 w-5" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-slate-100">{mode === "create" ? "Create User" : "Edit User"}</h3>
                            <p className="text-xs text-slate-500">{mode === "create" ? "Add a new user to the system" : user?.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6">
                    {(create.isError || update.isError) && (
                        <div className="mb-4">
                            <StatusAlert type="error" msg={(create.error || update.error) instanceof Error
                                ? ((create.error || update.error) as Error).message
                                : "Operation failed."} />
                        </div>
                    )}

                    {mode === "create" ? (
                        <form onSubmit={handleC(submitCreate)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <FormField label="Email" icon={<Mail className="h-3 w-3" />} error={errC.email?.message}>
                                        <Input placeholder="user@example.com" {...regC("email")} className="h-10 rounded-xl" />
                                    </FormField>
                                </div>
                                <FormField label="Full Name" error={errC.full_name?.message}>
                                    <Input placeholder="Jane Doe" {...regC("full_name")} className="h-10 rounded-xl" />
                                </FormField>
                                <FormField label="Role" icon={<Tag className="h-3 w-3" />} error={errC.role?.message}>
                                    <select {...regC("role")} className="flex h-10 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent dark:bg-slate-700 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </FormField>
                                <div className="col-span-2">
                                    <FormField label="Bio" icon={<FileText className="h-3 w-3" />} error={errC.bio?.message}>
                                        <Input placeholder="Short bio…" {...regC("bio")} className="h-10 rounded-xl" />
                                    </FormField>
                                </div>
                                <div className="col-span-2">
                                    <FormField label="Account Status" icon={<Shield className="h-3 w-3" />}>
                                        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <input type="checkbox" {...regC("is_active")} className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                User is active (Uncheck to block login)
                                            </span>
                                        </label>
                                    </FormField>
                                </div>
                                <div className="col-span-2">
                                    <FormField label="Password" icon={<Key className="h-3 w-3" />} error={errC.password?.message}>
                                        <div className="relative">
                                            <Input type={showPwd ? "text" : "password"} placeholder="Min 8 characters" {...regC("password")} className="h-10 rounded-xl pr-10" />
                                            <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </FormField>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl" disabled={isPending}>Cancel</Button>
                                <Button type="submit" className="flex-1 rounded-xl gap-2" disabled={isPending}>
                                    {isPending ? <><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating…</> : <><Plus className="h-4 w-4" />Create User</>}
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleE(submitEdit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <FormField label="Email" icon={<Mail className="h-3 w-3" />} error={errE.email?.message}>
                                        <Input placeholder="user@example.com" {...regE("email")} className="h-10 rounded-xl" />
                                    </FormField>
                                </div>
                                <FormField label="Full Name" error={errE.full_name?.message}>
                                    <Input placeholder="Jane Doe" {...regE("full_name")} className="h-10 rounded-xl" />
                                </FormField>
                                <FormField label="Role" icon={<Tag className="h-3 w-3" />} error={errE.role?.message}>
                                    <select {...regE("role")} className="flex h-10 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent dark:bg-slate-700 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </FormField>
                                <div className="col-span-2">
                                    <FormField label="Bio" icon={<FileText className="h-3 w-3" />} error={errE.bio?.message}>
                                        <Input placeholder="Short bio…" {...regE("bio")} className="h-10 rounded-xl" />
                                    </FormField>
                                </div>
                                <div className="col-span-2">
                                    <FormField label="Account Status" icon={<Shield className="h-3 w-3" />}>
                                        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <input type="checkbox" {...regE("is_active")} className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                User is active (Uncheck to block login)
                                            </span>
                                        </label>
                                    </FormField>
                                </div>
                                <div className="col-span-2">
                                    <FormField label="Reset Password" icon={<Key className="h-3 w-3" />} error={errE.new_password?.message} hint="Leave blank to keep existing password.">
                                        <div className="relative">
                                            <Input type={showPwd ? "text" : "password"} placeholder="New password (optional)" {...regE("new_password")} className="h-10 rounded-xl pr-10" />
                                            <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </FormField>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl" disabled={isPending}>Cancel</Button>
                                <Button type="submit" className="flex-1 rounded-xl gap-2 bg-amber-500 hover:bg-amber-600" disabled={isPending}>
                                    {isPending ? <><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</> : <><Edit3 className="h-4 w-4" />Save Changes</>}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [modal, setModal] = useState<{ mode: "create" | "edit"; user?: User } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
    const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

    const SIZE = 10;

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
        return () => clearTimeout(t);
    }, [search]);

    // Auth guard
    useEffect(() => {
        if (!authLoading && user && user.role !== "admin") router.replace("/");
        if (!authLoading && !user) router.replace("/login");
    }, [user, authLoading, router]);

    const statsQuery = useUserStats();
    const listQuery = useUserList({ page, size: SIZE, search: debouncedSearch || undefined, role: roleFilter || undefined });
    const deleteUser = useAdminDeleteUser();
    const updateUser = useAdminUpdateUser();

    const showToast = useCallback((type: "success" | "error", msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    }, []);

    const handleDeleteConfirm = () => {
        if (!deleteTarget) return;
        deleteUser.mutate(Number(deleteTarget.id), {
            onSuccess: () => { setDeleteTarget(null); showToast("success", `User "${deleteTarget.email}" deleted.`); },
            onError: (e) => { setDeleteTarget(null); showToast("error", e instanceof Error ? e.message : "Delete failed."); },
        });
    };

    const handleModalSuccess = () => {
        setModal(null);
        showToast("success", modal?.mode === "create" ? "User created successfully!" : "User updated successfully!");
    };

    const handleToggleBlock = (target: User) => {
        if (target.id === user?.id) return;
        const newState = !(target.is_active ?? true);
        const actionStr = newState ? "unblocked" : "blocked";
        updateUser.mutate(
            { id: Number(target.id), data: { is_active: newState } },
            {
                onSuccess: () => showToast("success", `User account ${actionStr}.`),
                onError: (e) => showToast("error", e instanceof Error ? e.message : `Failed to ${actionStr} user.`),
            }
        );
    };

    if (authLoading || !user) return null;

    const stats = statsQuery.data;
    const list = listQuery.data;

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">

                {/* Toast */}
                {toast && (
                    <div className="fixed top-6 right-6 z-50 animate-fade-in max-w-sm">
                        <StatusAlert type={toast.type} msg={toast.msg} />
                    </div>
                )}

                {/* Page header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">User Management</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Create, edit, and manage all users in the system.</p>
                    </div>
                    <Button onClick={() => setModal({ mode: "create" })} className="h-10 px-5 rounded-xl gap-2 shadow-sm">
                        <Plus className="h-4 w-4" /> Add User
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Total Users" value={stats?.total ?? "–"} icon={<Users className="h-6 w-6 text-white" />} gradient="bg-gradient-to-br from-blue-500 to-indigo-600" />
                    <StatCard label="Admins" value={stats?.admins ?? "–"} icon={<Shield className="h-6 w-6 text-white" />} gradient="bg-gradient-to-br from-purple-500 to-violet-600" />
                    <StatCard label="Regular Users" value={stats?.regular_users ?? "–"} icon={<UserCheck className="h-6 w-6 text-white" />} gradient="bg-gradient-to-br from-emerald-500 to-teal-600" />
                    <StatCard label="Newest Member" value={stats?.newest_user_email ? "1" : "–"} sub={stats?.newest_user_email} icon={<UserX className="h-6 w-6 text-white" />} gradient="bg-gradient-to-br from-amber-500 to-orange-500" />
                </div>

                {/* Search + filter toolbar */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name or email…"
                            className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {search && (
                            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                    <select
                        value={roleFilter}
                        onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
                        className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[130px]"
                    >
                        <option value="">All Roles</option>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                    <button
                        onClick={() => listQuery.refetch()}
                        className="h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-4 w-4 ${listQuery.isFetching ? "animate-spin" : ""}`} />
                    </button>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    {listQuery.isLoading ? (
                        <div className="p-8 space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-4 animate-pulse">
                                    <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                                        <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded w-1/4" />
                                    </div>
                                    <div className="h-6 w-16 bg-slate-100 dark:bg-slate-700 rounded-full" />
                                    <div className="h-8 w-20 bg-slate-100 dark:bg-slate-700 rounded-lg" />
                                </div>
                            ))}
                        </div>
                    ) : listQuery.isError ? (
                        <div className="p-12 text-center">
                            <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
                            <p className="text-slate-500 dark:text-slate-400">Failed to load users.</p>
                        </div>
                    ) : (list?.items.length ?? 0) === 0 ? (
                        <div className="p-12 text-center">
                            <Users className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                            <p className="font-semibold text-slate-600 dark:text-slate-400">No users found</p>
                            <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters.</p>
                        </div>
                    ) : (
                        <>
                            {/* Table header */}
                            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-4 px-6 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                <span className="w-10" />
                                <span>User</span>
                                <span className="text-center w-20">Role</span>
                                <span className="text-center w-24">Status</span>
                                <span className="text-center w-24">Joined</span>
                                <span className="w-24 text-right">Actions</span>
                            </div>

                            {/* Rows */}
                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {list?.items.map((u) => (
                                    <div key={u.id} className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-4 items-center px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                        <Avatar user={u} />
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                                                {u.full_name || <span className="text-slate-400 italic">No name</span>}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</p>
                                            {u.bio && <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5 italic">"{u.bio}"</p>}
                                        </div>
                                        <div className="w-20 flex justify-center">
                                            <RoleBadge role={u.role} />
                                        </div>
                                        <div className="w-24 flex justify-center">
                                            <StatusBadge isActive={u.is_active ?? true} />
                                        </div>
                                        <div className="w-24 text-center">
                                            <span className="text-xs text-slate-400">
                                                {u.created_date ? new Date(u.created_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                                            </span>
                                        </div>
                                        <div className="w-24 flex justify-end gap-1">
                                            <button
                                                onClick={() => handleToggleBlock(u)}
                                                className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${(u.is_active ?? true)
                                                    ? "text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    : "text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                                    }`}
                                                title={(u.is_active ?? true) ? "Block user" : "Unblock user"}
                                                disabled={u.id === user.id || updateUser.isPending}
                                            >
                                                {(u.is_active ?? true) ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                            </button>
                                            <button
                                                onClick={() => setModal({ mode: "edit", user: u })}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                                title="Edit user"
                                            >
                                                <Edit3 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteTarget(u)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Delete user"
                                                disabled={u.id === user.id}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination footer */}
                            {(list?.pages ?? 1) > 1 && (
                                <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Showing <strong>{((page - 1) * SIZE) + 1}</strong>–<strong>{Math.min(page * SIZE, list?.total ?? 0)}</strong> of <strong>{list?.total ?? 0}</strong> users
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[5rem] text-center">
                                            Page {page} of {list?.pages}
                                        </span>
                                        <button
                                            onClick={() => setPage(p => Math.min(list?.pages ?? 1, p + 1))}
                                            disabled={page === (list?.pages ?? 1)}
                                            className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

            </div>

            {/* Modals */}
            {modal && (
                <UserModal
                    mode={modal.mode}
                    user={modal.user}
                    onClose={() => setModal(null)}
                    onSuccess={handleModalSuccess}
                />
            )}
            {deleteTarget && (
                <DeleteModal
                    user={deleteTarget}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setDeleteTarget(null)}
                    isPending={deleteUser.isPending}
                />
            )}
        </DashboardLayout>
    );
}
