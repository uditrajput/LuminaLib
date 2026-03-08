"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences, useUpdateUserPreferences } from "@/hooks/usePreferences";
import { useUpdateProfile, useChangePassword } from "@/hooks/useProfile";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
    User, Settings, Lock, Save, AlertCircle, CheckCircle2,
    Mail, FileText, Link2, BookOpen, Globe, Shield, Camera,
    ChevronRight
} from "lucide-react";

// ── Schemas ────────────────────────────────────────────────────────────────

const profileSchema = z.object({
    full_name: z.string().optional(),
    email: z.string().email("Invalid email address").optional().or(z.literal("")),
    bio: z.string().max(300, "Bio must be 300 characters or less").optional(),
    avatar_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

const passwordSchema = z.object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z
        .string()
        .min(12, "Password must be at least 12 characters")
        .regex(/[A-Za-z]/, "Must contain at least one letter")
        .regex(/\d/, "Must contain at least one number")
        .regex(/[^A-Za-z0-9]/, "Must contain at least one symbol"),
    confirm_password: z.string(),
}).refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
});

const preferenceSchema = z.object({
    favoriteGenre: z.string().optional(),
    language: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;
type PreferenceFormData = z.infer<typeof preferenceSchema>;

// ── Tab type ───────────────────────────────────────────────────────────────

type Tab = "info" | "security" | "preferences";

// ── Profile Avatar ─────────────────────────────────────────────────────────

function ProfileAvatar({ avatarUrl, fullName, email }: { avatarUrl?: string; fullName?: string; email?: string }) {
    const initials = (fullName || email || "U")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="relative group">
            <div className="h-28 w-28 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-slate-700">
                {avatarUrl ? (
                    <img src={avatarUrl} alt={fullName || "Avatar"} className="h-full w-full object-cover" />
                ) : (
                    <span className="text-3xl font-bold text-white">{initials}</span>
                )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <Camera className="h-6 w-6 text-white" />
            </div>
        </div>
    );
}

// ── StatusAlert ────────────────────────────────────────────────────────────

function StatusAlert({ type, message }: { type: "success" | "error"; message: string }) {
    return (
        <div className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium animate-fade-in ${type === "success"
            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
            : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
            }`}>
            {type === "success"
                ? <CheckCircle2 className="h-5 w-5 shrink-0" />
                : <AlertCircle className="h-5 w-5 shrink-0" />}
            {message}
        </div>
    );
}

// ── FormField ──────────────────────────────────────────────────────────────

function FormField({
    label, icon, error, hint, children,
}: {
    label: string;
    icon?: React.ReactNode;
    error?: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                {icon && <span className="text-slate-400">{icon}</span>}
                {label}
            </label>
            {children}
            {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{error}</p>}
            {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
        </div>
    );
}

// ── Main ProfilePage ───────────────────────────────────────────────────────

export default function ProfilePage() {
    const { user, refreshUser } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>("info");

    // Profile form
    const { mutate: updateProfile, isPending: isSavingProfile, isSuccess: profileSuccess, isError: profileError, error: profileErr, reset: resetProfile } = useUpdateProfile();

    // Password form
    const { mutate: changePassword, isPending: isChangingPwd, isSuccess: pwdSuccess, isError: pwdError, error: pwdErr, reset: resetPwd } = useChangePassword();

    // Preferences
    const { data: preferences, isLoading: isFetchingPrefs } = useUserPreferences();
    const { mutate: updatePrefs, isPending: isSavingPrefs, isSuccess: prefsSuccess, isError: prefsError, error: prefsErr, reset: resetPrefs } = useUpdateUserPreferences();

    // Profile form
    const {
        register: regProfile,
        handleSubmit: handleProfileSubmit,
        setValue: setProfileValue,
        formState: { errors: profileErrors, isDirty: profileDirty },
        reset: resetProfileForm,
    } = useForm<ProfileFormData>({ resolver: zodResolver(profileSchema) });

    // Password form
    const {
        register: regPwd,
        handleSubmit: handlePwdSubmit,
        formState: { errors: pwdErrors },
        reset: resetPwdForm,
    } = useForm<PasswordFormData>({ resolver: zodResolver(passwordSchema) });

    // Preferences form
    const {
        register: regPrefs,
        handleSubmit: handlePrefsSubmit,
        setValue: setPrefsValue,
    } = useForm<PreferenceFormData>({ resolver: zodResolver(preferenceSchema) });

    // Populate profile form from user
    useEffect(() => {
        if (user) {
            setProfileValue("full_name", user.full_name || "");
            setProfileValue("email", user.email || "");
            setProfileValue("bio", user.bio || "");
            setProfileValue("avatar_url", user.avatar_url || "");
        }
    }, [user, setProfileValue]);

    // Populate prefs form
    useEffect(() => {
        if (preferences?.preferences) {
            setPrefsValue("favoriteGenre", preferences.preferences.favoriteGenre || "");
            setPrefsValue("language", preferences.preferences.language || "");
        }
    }, [preferences, setPrefsValue]);

    // Auto-dismiss success alerts
    useEffect(() => {
        if (profileSuccess) {
            refreshUser();
            const t = setTimeout(() => resetProfile(), 4000);
            return () => clearTimeout(t);
        }
    }, [profileSuccess, resetProfile, refreshUser]);

    useEffect(() => {
        if (pwdSuccess) {
            resetPwdForm();
            const t = setTimeout(() => resetPwd(), 4000);
            return () => clearTimeout(t);
        }
    }, [pwdSuccess, resetPwd, resetPwdForm]);

    useEffect(() => {
        if (prefsSuccess) {
            const t = setTimeout(() => resetPrefs(), 4000);
            return () => clearTimeout(t);
        }
    }, [prefsSuccess, resetPrefs]);

    // Submit handlers
    const onProfileSubmit = (data: ProfileFormData) => {
        updateProfile({
            full_name: data.full_name || undefined,
            email: data.email || undefined,
            bio: data.bio || undefined,
            avatar_url: data.avatar_url || undefined,
        });
    };

    const onPwdSubmit = (data: PasswordFormData) => {
        changePassword({ current_password: data.current_password, new_password: data.new_password });
    };

    const onPrefsSubmit = (data: PreferenceFormData) => {
        const currentPrefs = preferences?.preferences || {};
        updatePrefs({
            preferences: {
                ...currentPrefs,
                favoriteGenre: data.favoriteGenre,
                language: data.language,
            },
        });
    };

    if (!user) return null;

    // Tab config
    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: "info", label: "Account Info", icon: <User className="h-4 w-4" /> },
        { id: "security", label: "Security", icon: <Lock className="h-4 w-4" /> },
        { id: "preferences", label: "Preferences", icon: <Settings className="h-4 w-4" /> },
    ];

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
                {/* Page Header */}
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                        Profile Management
                    </h1>
                    <p className="mt-1 text-slate-500 dark:text-slate-400 text-sm">
                        Control your personal information, security settings, and reading preferences.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* ── Sidebar ── */}
                    <aside className="lg:col-span-1 space-y-4">
                        {/* Avatar Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center text-center space-y-3">
                            <ProfileAvatar
                                avatarUrl={user.avatar_url}
                                fullName={user.full_name}
                                email={user.email}
                            />
                            <div>
                                <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight break-all">
                                    {user.full_name || "LuminaLib User"}
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-all">{user.email}</p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                                    Active
                                </span>
                                {user.role === "admin" && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                        <Shield className="h-3 w-3" />
                                        Admin
                                    </span>
                                )}
                            </div>
                            {user.bio && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 italic leading-relaxed line-clamp-3">
                                    "{user.bio}"
                                </p>
                            )}
                        </div>

                        {/* Nav Tabs */}
                        <nav className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium transition-all group
                                        ${activeTab === tab.id
                                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-2 border-blue-500"
                                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                        }`}
                                >
                                    <span className="flex items-center gap-2.5">
                                        {tab.icon}
                                        {tab.label}
                                    </span>
                                    <ChevronRight className={`h-4 w-4 transition-transform ${activeTab === tab.id ? "text-blue-500" : "text-slate-300 group-hover:translate-x-0.5"}`} />
                                </button>
                            ))}
                        </nav>
                    </aside>

                    {/* ── Main Panel ── */}
                    <main className="lg:col-span-3">
                        {/* ── TAB: Account Info ── */}
                        {activeTab === "info" && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden animate-fade-in">
                                {/* Panel header */}
                                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-slate-100">Account Information</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Update your name, email, bio, and avatar.</p>
                                    </div>
                                </div>

                                <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="p-6 space-y-5">
                                    {profileSuccess && <StatusAlert type="success" message="Profile updated successfully!" />}
                                    {profileError && (
                                        <StatusAlert
                                            type="error"
                                            message={profileErr instanceof Error ? profileErr.message : "Failed to update profile."}
                                        />
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <FormField
                                            label="Full Name"
                                            icon={<User className="h-3.5 w-3.5" />}
                                            error={profileErrors.full_name?.message}
                                            hint="Your display name across LuminaLib."
                                        >
                                            <Input
                                                placeholder="e.g. Jane Doe"
                                                {...regProfile("full_name")}
                                                className="h-11 rounded-xl"
                                            />
                                        </FormField>

                                        <FormField
                                            label="Email Address"
                                            icon={<Mail className="h-3.5 w-3.5" />}
                                            error={profileErrors.email?.message}
                                            hint="Used for login and notifications."
                                        >
                                            <Input
                                                type="email"
                                                placeholder="you@example.com"
                                                {...regProfile("email")}
                                                className="h-11 rounded-xl"
                                            />
                                        </FormField>
                                    </div>

                                    <FormField
                                        label="Bio"
                                        icon={<FileText className="h-3.5 w-3.5" />}
                                        error={profileErrors.bio?.message}
                                        hint="A short description about yourself (max 300 characters)."
                                    >
                                        <textarea
                                            placeholder="Tell us a bit about yourself and your reading tastes..."
                                            {...regProfile("bio")}
                                            rows={3}
                                            className="flex w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-gray-400 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        />
                                    </FormField>

                                    <FormField
                                        label="Avatar URL"
                                        icon={<Link2 className="h-3.5 w-3.5" />}
                                        error={profileErrors.avatar_url?.message}
                                        hint="Link to a public profile picture."
                                    >
                                        <Input
                                            type="url"
                                            placeholder="https://example.com/avatar.jpg"
                                            {...regProfile("avatar_url")}
                                            className="h-11 rounded-xl"
                                        />
                                    </FormField>

                                    {/* Read-only info */}
                                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                                        <Shield className="h-4 w-4 text-slate-400 shrink-0" />
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Account role: <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">{user.role}</span>.
                                            Role changes require contacting an administrator.
                                        </p>
                                    </div>

                                    <div className="pt-2 flex items-center gap-3">
                                        <Button
                                            type="submit"
                                            disabled={isSavingProfile}
                                            className="h-11 px-7 rounded-xl font-semibold gap-2"
                                        >
                                            {isSavingProfile ? (
                                                <span className="flex items-center gap-2">
                                                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                                    Saving…
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    <Save className="h-4 w-4" />
                                                    Save Changes
                                                </span>
                                            )}
                                        </Button>
                                        {profileDirty && !isSavingProfile && (
                                            <span className="text-xs text-amber-500 dark:text-amber-400 font-medium">Unsaved changes</span>
                                        )}
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* ── TAB: Security ── */}
                        {activeTab === "security" && (
                            <div className="space-y-6 animate-fade-in">
                                {/* Change Password Card */}
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                                        <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-xl text-orange-500 dark:text-orange-400">
                                            <Lock className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-slate-100">Change Password</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Use a strong, unique password you don't use elsewhere.</p>
                                        </div>
                                    </div>

                                    <form onSubmit={handlePwdSubmit(onPwdSubmit)} className="p-6 space-y-5">
                                        {pwdSuccess && <StatusAlert type="success" message="Password changed successfully!" />}
                                        {pwdError && (
                                            <StatusAlert
                                                type="error"
                                                message={pwdErr instanceof Error ? pwdErr.message : "Failed to change password."}
                                            />
                                        )}

                                        <FormField
                                            label="Current Password"
                                            error={pwdErrors.current_password?.message}
                                        >
                                            <Input
                                                type="password"
                                                placeholder="Enter your current password"
                                                {...regPwd("current_password")}
                                                className="h-11 rounded-xl"
                                            />
                                        </FormField>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <FormField
                                                label="New Password"
                                                error={pwdErrors.new_password?.message}
                                                hint="Minimum 12 characters with letters, numbers & symbols."
                                            >
                                                <Input
                                                    type="password"
                                                    placeholder="New password"
                                                    {...regPwd("new_password")}
                                                    className="h-11 rounded-xl"
                                                />
                                            </FormField>

                                            <FormField
                                                label="Confirm New Password"
                                                error={pwdErrors.confirm_password?.message}
                                            >
                                                <Input
                                                    type="password"
                                                    placeholder="Confirm new password"
                                                    {...regPwd("confirm_password")}
                                                    className="h-11 rounded-xl"
                                                />
                                            </FormField>
                                        </div>

                                        <div className="pt-2">
                                            <Button
                                                type="submit"
                                                disabled={isChangingPwd}
                                                className="h-11 px-7 rounded-xl font-semibold gap-2 bg-orange-500 hover:bg-orange-600"
                                            >
                                                {isChangingPwd ? (
                                                    <span className="flex items-center gap-2">
                                                        <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                                        Updating…
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-2">
                                                        <Lock className="h-4 w-4" />
                                                        Update Password
                                                    </span>
                                                )}
                                            </Button>
                                        </div>
                                    </form>
                                </div>

                                {/* Security Tips Card */}
                                <div className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-900/20 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-3 flex items-center gap-2">
                                        <Shield className="h-4 w-4 text-blue-500" />
                                        Security Tips
                                    </h4>
                                    <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                                        {[
                                            "Use at least 12 characters with a mix of letters, numbers, and symbols.",
                                            "Never reuse passwords across different services.",
                                            "Consider using a password manager for stronger, unique passwords.",
                                            "Your session token is stored locally and never shared.",
                                        ].map((tip, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                                {tip}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* ── TAB: Preferences ── */}
                        {activeTab === "preferences" && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden animate-fade-in">
                                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                                    <div className="p-2 bg-violet-50 dark:bg-violet-900/30 rounded-xl text-violet-600 dark:text-violet-400">
                                        <BookOpen className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-slate-100">Reading Preferences</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Help our AI surface the best books for your taste.</p>
                                    </div>
                                </div>

                                {isFetchingPrefs ? (
                                    <div className="p-6 space-y-5 animate-pulse">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="h-11 rounded-xl bg-slate-100 dark:bg-slate-700" />
                                        ))}
                                    </div>
                                ) : (
                                    <form onSubmit={handlePrefsSubmit(onPrefsSubmit)} className="p-6 space-y-5">
                                        {prefsSuccess && <StatusAlert type="success" message="Preferences saved successfully!" />}
                                        {prefsError && (
                                            <StatusAlert
                                                type="error"
                                                message={prefsErr instanceof Error ? prefsErr.message : "Failed to save preferences."}
                                            />
                                        )}

                                        <FormField
                                            label="Favorite Genres"
                                            icon={<BookOpen className="h-3.5 w-3.5" />}
                                            hint="Separate multiple genres with commas."
                                        >
                                            <Input
                                                type="text"
                                                placeholder="e.g. Science Fiction, Mystery, Biography..."
                                                {...regPrefs("favoriteGenre")}
                                                className="h-11 rounded-xl"
                                            />
                                        </FormField>

                                        <FormField
                                            label="Preferred Language"
                                            icon={<Globe className="h-3.5 w-3.5" />}
                                            hint="Recommendations will prioritize books in this language."
                                        >
                                            <Input
                                                type="text"
                                                placeholder="e.g. English, Spanish, French..."
                                                {...regPrefs("language")}
                                                className="h-11 rounded-xl"
                                            />
                                        </FormField>

                                        <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 flex items-start gap-3">
                                            <BookOpen className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                                            <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">
                                                These preferences guide your personalized recommendations. The more specific you are, the better LuminaLib can tailor suggestions for you.
                                            </p>
                                        </div>

                                        <div className="pt-2">
                                            <Button
                                                type="submit"
                                                disabled={isSavingPrefs}
                                                className="h-11 px-7 rounded-xl font-semibold gap-2"
                                            >
                                                {isSavingPrefs ? (
                                                    <span className="flex items-center gap-2">
                                                        <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                                        Saving…
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-2">
                                                        <Save className="h-4 w-4" />
                                                        Save Preferences
                                                    </span>
                                                )}
                                            </Button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </DashboardLayout>
    );
}
