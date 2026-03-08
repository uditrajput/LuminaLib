"use client";

import React, { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useAppConfigs, useCreateAppConfig, useUpdateAppConfig } from "@/hooks/useAppConfigs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AppConfig } from "@/types/appConfig";
import {
    Settings, Search, Plus, Edit3, X, CheckCircle2,
    AlertCircle, FileText, Settings2, Key, Database,
    Cpu, Server, Cloud, Zap, ChevronDown
} from "lucide-react";

// ── Schemas ───────────────────────────────────────────────────────────────────

const createSchema = z.object({
    key: z.string().min(1, "Key is required"),
    value: z.string().min(1, "Value is required"),
    description: z.string().optional(),
});

const editSchema = z.object({
    value: z.string().min(1, "Value is required"),
    description: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

// ── LLM provider metadata ─────────────────────────────────────────────────────

const LLM_PROVIDERS = [
    { value: "docker", label: "Docker Model Runner", icon: <Server className="h-4 w-4" />, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30", desc: "Uses Docker Desktop's built-in model serving" },
    { value: "openrouter", label: "OpenRouter", icon: <Zap className="h-4 w-4" />, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/30", desc: "Route to 200+ LLMs via OpenRouter API" },
    { value: "ollama", label: "Ollama", icon: <Cpu className="h-4 w-4" />, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30", desc: "Local models via Ollama on your machine" },
    { value: "openai", label: "OpenAI", icon: <Cloud className="h-4 w-4" />, color: "text-slate-800 dark:text-slate-200", bg: "bg-slate-100 dark:bg-slate-700/50", desc: "GPT-4o, GPT-4o-mini via OpenAI API" },
    { value: "mock", label: "Mock (Testing)", icon: <Settings className="h-4 w-4" />, color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-800", desc: "Returns placeholder responses for testing" },
];

// Map which config keys belong to which provider
const PROVIDER_CONFIG_KEYS: Record<string, string[]> = {
    openrouter: ["openrouter_api_key", "openrouter_model"],
    ollama: ["ollama_base_url", "ollama_model"],
    openai: ["openai_api_key", "openai_model"],
    docker: ["docker_model", "docker_base_url"],
    mock: [],
};

// Keys that should NOT be displayed in the general config table
const HIDDEN_KEYS = new Set([
    "llm_provider",
    "openrouter_api_key", "openrouter_model",
    "ollama_base_url", "ollama_model",
    "openai_api_key", "openai_model",
    "docker_model", "docker_base_url",
    "admin_email", "admin_password",
]);

// ── Small helpers ─────────────────────────────────────────────────────────────

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

// ── LLM Provider Panel ────────────────────────────────────────────────────────

function LLMProviderPanel({ configs, onConfigUpdate }: {
    configs: AppConfig[];
    onConfigUpdate: () => void;
}) {
    const update = useUpdateAppConfig();

    // Find current provider value
    const providerConfig = configs.find(c => c.key === "llm_provider");
    const currentProvider = providerConfig?.value || "docker";
    const [selectedProvider, setSelectedProvider] = useState(currentProvider);
    const [showDropdown, setShowDropdown] = useState(false);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setSelectedProvider(currentProvider);
    }, [currentProvider]);

    const handleProviderChange = (newProvider: string) => {
        setSelectedProvider(newProvider);
        setShowDropdown(false);
        setSaving(true);
        update.mutate(
            { key: "llm_provider", data: { value: newProvider } },
            {
                onSuccess: () => {
                    setSaving(false);
                    onConfigUpdate();
                },
                onError: () => setSaving(false),
            }
        );
    };

    const handleFieldSave = (key: string) => {
        setSaving(true);
        update.mutate(
            { key, data: { value: editValue } },
            {
                onSuccess: () => {
                    setSaving(false);
                    setEditingKey(null);
                    onConfigUpdate();
                },
                onError: () => setSaving(false),
            }
        );
    };

    const currentMeta = LLM_PROVIDERS.find(p => p.value === selectedProvider) || LLM_PROVIDERS[4];
    const relevantKeys = PROVIDER_CONFIG_KEYS[selectedProvider] || [];

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                <div className={`p-2 rounded-xl ${currentMeta.bg} ${currentMeta.color}`}>
                    <Cpu className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">LLM Provider</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Choose which AI model backend powers your LuminaLib intelligence.</p>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Provider selector */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                        Active Provider
                    </label>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="w-full flex items-center justify-between gap-3 h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-sm font-medium text-slate-900 dark:text-slate-100 hover:border-blue-400 dark:hover:border-blue-500 transition-all"
                        >
                            <span className="flex items-center gap-3">
                                <span className={`p-1.5 rounded-lg ${currentMeta.bg} ${currentMeta.color}`}>
                                    {currentMeta.icon}
                                </span>
                                <span>
                                    <span className="block text-left">{currentMeta.label}</span>
                                    <span className="block text-[11px] text-slate-400 dark:text-slate-500 text-left">{currentMeta.desc}</span>
                                </span>
                            </span>
                            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
                        </button>

                        {showDropdown && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
                                {LLM_PROVIDERS.map((p) => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => handleProviderChange(p.value)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50 ${selectedProvider === p.value ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                                    >
                                        <span className={`p-1.5 rounded-lg ${p.bg} ${p.color}`}>
                                            {p.icon}
                                        </span>
                                        <span className="flex-1 min-w-0">
                                            <span className="block font-medium text-slate-900 dark:text-slate-100">{p.label}</span>
                                            <span className="block text-[11px] text-slate-400 dark:text-slate-500">{p.desc}</span>
                                        </span>
                                        {selectedProvider === p.value && (
                                            <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {saving && (
                        <p className="text-xs text-blue-500 flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                            Saving…
                        </p>
                    )}
                </div>

                {/* Provider-specific config fields */}
                {relevantKeys.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            {currentMeta.label} Configuration
                        </p>
                        {relevantKeys.map((key) => {
                            const cfg = configs.find(c => c.key === key);
                            const isSecret = key.includes("api_key") || key.includes("secret");
                            const displayValue = cfg?.value || "";
                            const isEditing = editingKey === key;

                            return (
                                <div key={key} className="flex items-center gap-3 group">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            {key}
                                        </p>
                                        {isEditing ? (
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type={isSecret ? "password" : "text"}
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    className="h-9 rounded-lg text-sm flex-1"
                                                    autoFocus
                                                />
                                                <Button
                                                    onClick={() => handleFieldSave(key)}
                                                    disabled={saving}
                                                    className="h-9 px-3 rounded-lg text-xs gap-1 bg-blue-600 text-white hover:bg-blue-700"
                                                >
                                                    <CheckCircle2 className="h-3 w-3" /> Save
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setEditingKey(null)}
                                                    className="h-9 px-3 rounded-lg text-xs"
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 flex-1 truncate">
                                                    {isSecret && displayValue ? "••••••••••••••" : (displayValue || "—")}
                                                </p>
                                                <button
                                                    onClick={() => { setEditingKey(key); setEditValue(displayValue); }}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors opacity-0 group-hover:opacity-100"
                                                    title={`Edit ${key}`}
                                                >
                                                    <Edit3 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Edit/Create Modal ─────────────────────────────────────────────────────────

function ConfigModal({ mode, config, onClose, onSuccess }: {
    mode: "create" | "edit";
    config?: AppConfig;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const create = useCreateAppConfig();
    const update = useUpdateAppConfig();
    const isPending = create.isPending || update.isPending;

    const { register: regC, handleSubmit: handleC, formState: { errors: errC } } =
        useForm<CreateForm>({ resolver: zodResolver(createSchema) });

    const { register: regE, handleSubmit: handleE, formState: { errors: errE }, setValue: setEV } =
        useForm<EditForm>({ resolver: zodResolver(editSchema) });

    useEffect(() => {
        if (mode === "edit" && config) {
            setEV("value", config.value);
            setEV("description", config.description || "");
        }
    }, [mode, config, setEV]);

    const submitCreate = (data: CreateForm) => {
        create.mutate(data, { onSuccess });
    };

    const submitEdit = (data: EditForm) => {
        if (!config) return;
        update.mutate({ key: config.key, data }, { onSuccess });
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 dark:border-slate-700 animate-fade-in overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${mode === "create" ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600" : "bg-amber-50 dark:bg-amber-900/30 text-amber-500"}`}>
                            {mode === "create" ? <Plus className="h-5 w-5" /> : <Edit3 className="h-5 w-5" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-slate-100">{mode === "create" ? "Create Config" : "Edit Config"}</h3>
                            <p className="text-xs text-slate-500">{mode === "create" ? "Add a new dynamic configuration" : config?.key}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                        <X className="h-5 w-5" />
                    </button>
                </div>

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
                            <div className="space-y-4">
                                <FormField label="Key Name" icon={<Key className="h-3 w-3" />} error={errC.key?.message}>
                                    <Input placeholder="e.g. max_users_allowed" {...regC("key")} className="h-10 rounded-xl" />
                                </FormField>
                                <FormField label="Value" error={errC.value?.message}>
                                    <Input placeholder="Configuration value" {...regC("value")} className="h-10 rounded-xl" />
                                </FormField>
                                <FormField label="Description" icon={<FileText className="h-3 w-3" />} error={errC.description?.message}>
                                    <Input placeholder="Short description…" {...regC("description")} className="h-10 rounded-xl" />
                                </FormField>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl" disabled={isPending}>Cancel</Button>
                                <Button type="submit" className="flex-1 rounded-xl gap-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border shadow-sm transition-all text-black bg-white dark:text-white dark:bg-black" disabled={isPending}>
                                    {isPending ? <><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating…</> : <><Plus className="h-4 w-4" />Create</>}
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleE(submitEdit)} className="space-y-4">
                            <div className="space-y-4">
                                <FormField label="Value" error={errE.value?.message}>
                                    <Input placeholder="Configuration value" {...regE("value")} className="h-10 rounded-xl" />
                                </FormField>
                                <FormField label="Description" icon={<FileText className="h-3 w-3" />} error={errE.description?.message}>
                                    <Input placeholder="Short description…" {...regE("description")} className="h-10 rounded-xl" />
                                </FormField>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl" disabled={isPending}>Cancel</Button>
                                <Button type="submit" className="flex-1 rounded-xl gap-2 bg-amber-500 text-white border-amber-500 hover:bg-amber-600 hover:text-white transition-all shadow-sm" disabled={isPending}>
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

export default function AppConfigPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [search, setSearch] = useState("");
    const [modal, setModal] = useState<{ mode: "create" | "edit"; config?: AppConfig } | null>(null);
    const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

    // Auth guard
    useEffect(() => {
        if (!authLoading && user && user.role !== "admin") router.replace("/");
        if (!authLoading && !user) router.replace("/login");
    }, [user, authLoading, router]);

    const listQuery = useAppConfigs();

    const showToast = useCallback((type: "success" | "error", msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    }, []);

    const handleModalSuccess = () => {
        setModal(null);
        showToast("success", modal?.mode === "create" ? "Config created successfully!" : "Config updated successfully!");
    };

    const handleLLMUpdate = () => {
        listQuery.refetch();
        showToast("success", "LLM configuration updated!");
    };

    if (authLoading || !user) return null;

    const items = listQuery.data || [];

    // Separate LLM configs from general configs
    const generalItems = items.filter(c =>
        !HIDDEN_KEYS.has(c.key) &&
        (c.key.toLowerCase().includes(search.toLowerCase()) ||
            (c.description || "").toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">

                {toast && (
                    <div className="fixed top-6 right-6 z-50 animate-fade-in max-w-sm">
                        <StatusAlert type={toast.type} msg={toast.msg} />
                    </div>
                )}

                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
                            <Settings2 className="h-8 w-8 text-blue-600 dark:text-blue-500" />
                            Dynamic Settings
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage application-wide key-value configurations replacing .env setups dynamically.</p>
                    </div>
                    <Button onClick={() => setModal({ mode: "create" })} className="h-10 px-5 rounded-xl gap-2 shadow-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 hover:text-white transition-all">
                        <Plus className="h-4 w-4" /> Add Config
                    </Button>
                </div>

                {/* LLM Provider Panel */}
                <LLMProviderPanel
                    configs={items}
                    onConfigUpdate={handleLLMUpdate}
                />

                {/* General Configuration */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search general settings by key or description…"
                            className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        />
                        {search && (
                            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    {listQuery.isLoading ? (
                        <div className="p-8 space-y-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-4 animate-pulse">
                                    <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
                                        <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded w-1/3" />
                                    </div>
                                    <div className="h-8 w-20 bg-slate-100 dark:bg-slate-700 rounded-lg" />
                                </div>
                            ))}
                        </div>
                    ) : listQuery.isError ? (
                        <div className="p-12 text-center">
                            <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
                            <p className="text-slate-500 dark:text-slate-400">Failed to load configuration keys.</p>
                        </div>
                    ) : generalItems.length === 0 ? (
                        <div className="p-12 text-center">
                            <Database className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                            <p className="font-semibold text-slate-600 dark:text-slate-400">No configs found</p>
                            <p className="text-sm text-slate-400 mt-1">Try adjusting your search criteria.</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-[1fr_1.5fr_1.5fr_auto] gap-x-4 px-6 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                <span>Key Name</span>
                                <span>Value</span>
                                <span>Description</span>
                                <span className="w-16 text-right">Actions</span>
                            </div>

                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {generalItems.map((c) => (
                                    <div key={c.id} className="grid grid-cols-[1fr_1.5fr_1.5fr_auto] gap-x-4 items-center px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                        <div className="min-w-0">
                                            <p className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-tight truncate border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded inline-block">
                                                {c.key}
                                            </p>
                                        </div>
                                        <div className="min-w-0 pr-4">
                                            <p className="text-sm text-slate-600 dark:text-slate-400 truncate bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                                                {c.key.toLowerCase().includes("password") || c.key.toLowerCase().includes("secret") || c.key.toLowerCase().includes("api_key") ? "••••••••••••••••" : c.value}
                                            </p>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate italic">
                                                {c.description || "—"}
                                            </p>
                                        </div>
                                        <div className="w-16 flex justify-end gap-1">
                                            <button
                                                onClick={() => setModal({ mode: "edit", config: c })}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                                title="Edit configuration"
                                            >
                                                <Edit3 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

            </div>

            {modal && (
                <ConfigModal
                    mode={modal.mode}
                    config={modal.config}
                    onClose={() => setModal(null)}
                    onSuccess={handleModalSuccess}
                />
            )}
        </DashboardLayout>
    );
}
