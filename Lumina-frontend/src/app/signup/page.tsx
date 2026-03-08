"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { registerUser } from "@/services/authService";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import {
    BookOpen, AlertCircle, ArrowRight, Sparkles, BrainCircuit,
    Shield, CheckCircle2, XCircle, Eye, EyeOff,
} from "lucide-react";
import { useRouter } from "next/navigation";

// ── Password strength helpers ──────────────────────────────────────────────

const passwordRules = [
    { label: "At least 12 characters", test: (v: string) => v.length >= 12 },
    { label: "Contains a letter", test: (v: string) => /[A-Za-z]/.test(v) },
    { label: "Contains a number", test: (v: string) => /\d/.test(v) },
    { label: "Contains a symbol", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

const securityTips = [
    "Use at least 12 characters with a mix of letters, numbers, and symbols.",
    "Never reuse passwords across different services.",
    "Consider using a password manager for stronger, unique passwords.",
    "Your session token is stored locally and never shared.",
];

// ── Zod schema ─────────────────────────────────────────────────────────────

const signupSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z
        .string()
        .min(12, { message: "Password must be at least 12 characters" })
        .regex(/[A-Za-z]/, { message: "Must contain at least one letter" })
        .regex(/\d/, { message: "Must contain at least one number" })
        .regex(/[^A-Za-z0-9]/, { message: "Must contain at least one symbol" }),
    confirm_password: z.string(),
    full_name: z.string().min(2, { message: "Name must be at least 2 characters" }).optional(),
}).refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.push("/books");
        }
    }, [isLoading, isAuthenticated, router]);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<SignupFormData>({
        resolver: zodResolver(signupSchema),
    });

    const passwordValue = watch("password", "");

    const onSubmit = async (data: SignupFormData) => {
        setError(null);
        try {
            await registerUser({ email: data.email, password: data.password, full_name: data.full_name });
            setSuccess(true);
            setTimeout(() => {
                router.push("/login");
            }, 2000);
        } catch (err: any) {
            console.error(err);
            setError(err?.response?.data?.detail || "An error occurred during registration");
        }
    };

    if (isLoading || isAuthenticated) {
        return null;
    }

    return (
        <DashboardLayout>
            <div className="flex relative overflow-hidden font-sans rounded-3xl min-h-[80vh] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 shadow-sm">

                {/* 3D Background Elements */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 dark:bg-blue-600/20 blur-[130px] rounded-full animate-pulse-glow" />
                    <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[50%] bg-indigo-600/10 dark:bg-indigo-600/20 blur-[130px] rounded-full animate-pulse-glow" style={{ animationDelay: '2s' }} />
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] dark:opacity-[0.03] mix-blend-overlay" />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_20%,transparent_100%)]" />
                </div>

                {/* Left Box: Promo / Aesthetics */}
                <div className="hidden lg:flex flex-1 relative z-10 items-center justify-center p-12 order-2">
                    <div className="max-w-lg space-y-8 animate-fade-in pl-12">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-sm font-medium backdrop-blur-md">
                            <Sparkles className="h-4 w-4" /> Join LuminaLib
                        </div>
                        <h1 className="text-5xl font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">
                            Begin your journey<br />into <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">Intelligent Reading</span>.
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-light">
                            Create an account to read and analyze your favorite books. Let our AI recommendation engine uncover your next masterpiece.
                        </p>

                        {/* Security Tips Card */}
                        <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-white/50 dark:border-white/10 p-5 shadow-lg">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-3 flex items-center gap-2">
                                <Shield className="h-4 w-4 text-blue-500" />
                                Security Tips
                            </h4>
                            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                                {securityTips.map((tip, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Floating Glassmorphism Ornaments */}
                        <div className="relative h-32 mt-6 w-full">
                            <div className="absolute top-0 right-10 w-28 h-28 rounded-3xl bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/10 backdrop-blur-xl -rotate-12 flex items-center justify-center shadow-2xl animate-bounce" style={{ animationDuration: '7s' }}>
                                <BookOpen className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="absolute top-8 right-44 w-36 h-36 rounded-full bg-gradient-to-bl from-indigo-500/10 to-blue-500/10 border border-white/40 dark:border-white/5 backdrop-blur-3xl rotate-6 flex items-center justify-center shadow-2xl animate-bounce" style={{ animationDuration: '9s', animationDelay: '1s' }}>
                                <BrainCircuit className="h-14 w-14 text-indigo-600 dark:text-indigo-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Box: Signup Form */}
                <div className="flex-1 flex items-center justify-center p-6 relative z-10 order-1">
                    <div className="w-full max-w-md animate-fade-in-up">
                        <div className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] rounded-[2rem] p-8 sm:p-10 relative overflow-hidden">

                            {/* Glow inside the card */}
                            <div className="absolute top-[-50px] left-[-50px] w-[150px] h-[150px] bg-indigo-500/20 blur-[50px] rounded-full pointer-events-none" />

                            <div className="mb-8 relative z-10">
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Create Account</h2>
                                <p className="text-slate-600 dark:text-slate-400 text-sm">Sign up and discover a new way to read.</p>
                            </div>

                            {success ? (
                                <div className="p-6 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-600 dark:text-green-400 rounded-2xl text-center relative z-10 backdrop-blur-sm">
                                    <h3 className="font-bold text-lg mb-1">Welcome aboard!</h3>
                                    <p className="text-sm opacity-80">Registration successful. Redirecting...</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 relative z-10">
                                    {error && (
                                        <div className="flex items-center gap-3 p-4 text-sm text-red-700 dark:text-red-200 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl">
                                            <AlertCircle className="h-5 w-5 shrink-0 text-red-500 dark:text-red-400" />
                                            {error}
                                        </div>
                                    )}

                                    {/* Full Name */}
                                    <div className="space-y-1.5">
                                        <label htmlFor="full_name" className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Full Name</label>
                                        <Input
                                            id="full_name"
                                            type="text"
                                            placeholder="John Doe"
                                            {...register("full_name")}
                                            className="h-12 rounded-2xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all px-5"
                                        />
                                        {errors.full_name && (
                                            <p className="text-xs text-red-500 ml-1">{errors.full_name.message}</p>
                                        )}
                                    </div>

                                    {/* Email */}
                                    <div className="space-y-1.5">
                                        <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Email Address</label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="you@example.com"
                                            {...register("email")}
                                            className="h-12 rounded-2xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all px-5"
                                        />
                                        {errors.email && (
                                            <p className="text-xs text-red-500 ml-1">{errors.email.message}</p>
                                        )}
                                    </div>

                                    {/* Password */}
                                    <div className="space-y-1.5">
                                        <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Password</label>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••••••"
                                                {...register("password")}
                                                className="h-12 rounded-2xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all px-5 pr-12"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                                tabIndex={-1}
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>

                                        {/* Live password strength indicators */}
                                        {passwordValue.length > 0 && (
                                            <div className="mt-2 space-y-1.5 pl-1 animate-fade-in">
                                                {passwordRules.map((rule, i) => {
                                                    const passed = rule.test(passwordValue);
                                                    return (
                                                        <div key={i} className={`flex items-center gap-1.5 text-xs transition-colors ${passed ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                                                            {passed
                                                                ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                                                : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                                                            {rule.label}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {errors.password && !passwordValue && (
                                            <p className="text-xs text-red-500 ml-1">{errors.password.message}</p>
                                        )}
                                    </div>

                                    {/* Confirm Password */}
                                    <div className="space-y-1.5">
                                        <label htmlFor="confirm_password" className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Confirm Password</label>
                                        <div className="relative">
                                            <Input
                                                id="confirm_password"
                                                type={showConfirm ? "text" : "password"}
                                                placeholder="••••••••••••"
                                                {...register("confirm_password")}
                                                className="h-12 rounded-2xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all px-5 pr-12"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirm(!showConfirm)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                                tabIndex={-1}
                                            >
                                                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        {errors.confirm_password && (
                                            <p className="text-xs text-red-500 ml-1">{errors.confirm_password.message}</p>
                                        )}
                                    </div>

                                    {/* Mobile: Security Tips (shown only on small screens) */}
                                    <div className="lg:hidden bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-900/20 rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
                                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs mb-2 flex items-center gap-1.5">
                                            <Shield className="h-3.5 w-3.5 text-blue-500" />
                                            Security Tips
                                        </h4>
                                        <ul className="space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                            {securityTips.map((tip, i) => (
                                                <li key={i} className="flex items-start gap-1.5">
                                                    <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                                                    {tip}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full h-12 text-base rounded-2xl font-bold mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 border-0 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? "Creating account..." : (
                                            <>
                                                Sign Up
                                                <ArrowRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </Button>
                                </form>
                            )}

                            <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400 relative z-10">
                                Already have an account?{" "}
                                <Link
                                    href="/login"
                                    className="font-semibold text-indigo-600 dark:text-indigo-400 transition-colors hover:text-indigo-500 hover:underline"
                                >
                                    Log in
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
