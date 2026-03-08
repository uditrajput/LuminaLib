"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { loginUser } from "@/services/authService";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, LogIn, AlertCircle, Sparkles, BrainCircuit } from "lucide-react";

const loginSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string().min(1, { message: "Password is required" }),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const { login, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.push("/books");
        }
    }, [isLoading, isAuthenticated, router]);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormData) => {
        setError(null);
        try {
            const token = await loginUser(data.email, data.password);
            login(token);
            router.push("/books");
        } catch (err: any) {
            setError(err?.response?.data?.detail || "Invalid email or password");
        }
    };

    if (isLoading || isAuthenticated) {
        return null;
    }

    return (
        <DashboardLayout>
            <div className="flex relative overflow-hidden font-sans rounded-3xl min-h-[80vh] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 shadow-sm">

                {/* 3D Background Elements shared with the homepage aesthetic */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 dark:bg-blue-600/20 blur-[130px] rounded-full animate-pulse-glow" />
                    <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[50%] bg-indigo-600/10 dark:bg-indigo-600/20 blur-[130px] rounded-full animate-pulse-glow" style={{ animationDelay: '2s' }} />

                    {/* Subtle grid */}
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] dark:opacity-[0.03] mix-blend-overlay" />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_20%,transparent_100%)]" />
                </div>

                {/* Left Box: Promo / Aesthetics */}
                <div className="hidden lg:flex flex-1 relative z-10 items-center justify-center p-12">
                    <div className="max-w-lg space-y-8 animate-fade-in">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium backdrop-blur-md">
                            <Sparkles className="h-4 w-4" /> Welcome back to LuminaLib
                        </div>
                        <h1 className="text-5xl font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">
                            Power your reading<br />with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Artificial Intelligence</span>.
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-light">
                            Log in to resume where you left off. Access personalized recommendations, neural-generated summaries, and the collective consensus of our intelligent community.
                        </p>

                        {/* Floating Glassmorphism Ornaments */}
                        <div className="relative h-48 mt-12 w-full">
                            <div className="absolute top-0 left-0 w-32 h-32 rounded-3xl bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/10 backdrop-blur-xl rotate-12 flex items-center justify-center shadow-2xl animate-bounce" style={{ animationDuration: '6s' }}>
                                <BookOpen className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="absolute top-10 left-44 w-40 h-40 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/40 dark:border-white/5 backdrop-blur-3xl -rotate-6 flex items-center justify-center shadow-2xl animate-bounce" style={{ animationDuration: '8s', animationDelay: '1s' }}>
                                <BrainCircuit className="h-16 w-16 text-indigo-600 dark:text-indigo-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Box: Login Form */}
                <div className="flex-1 flex items-center justify-center p-6 relative z-10">
                    <div className="w-full max-w-md animate-fade-in-up">
                        <div className="bg-white/60 dark:bg-white/5 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] rounded-[2rem] p-8 sm:p-12 relative overflow-hidden">

                            {/* Glow inside the card */}
                            <div className="absolute top-[-50px] right-[-50px] w-[150px] h-[150px] bg-blue-500/20 blur-[50px] rounded-full pointer-events-none" />

                            <div className="mb-10 relative z-10">
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Sign In</h2>
                                <p className="text-slate-600 dark:text-slate-400 text-sm">Log in to enter your personalized dashboard.</p>
                            </div>

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative z-10">
                                {error && (
                                    <div className="flex items-center gap-3 p-4 text-sm text-red-700 dark:text-red-200 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl">
                                        <AlertCircle className="h-5 w-5 shrink-0 text-red-500 dark:text-red-400" />
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Email Address</label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        {...register("email")}
                                        className="h-14 rounded-2xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all px-5"
                                    />
                                    {errors.email && (
                                        <p className="text-xs text-red-500 ml-1">{errors.email.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center ml-1">
                                        <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                                    </div>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        {...register("password")}
                                        className="h-14 rounded-2xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all px-5"
                                    />
                                    {errors.password && (
                                        <p className="text-xs text-red-500 ml-1">{errors.password.message}</p>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full h-14 text-base rounded-2xl font-bold mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 border-0 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? "Authenticating..." : (
                                        <>
                                            Sign In
                                            <LogIn className="w-5 h-5" />
                                        </>
                                    )}
                                </Button>
                            </form>

                            <div className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400 relative z-10">
                                Don't have an account?{" "}
                                <Link
                                    href="/signup"
                                    className="font-semibold text-blue-600 dark:text-blue-400 transition-colors hover:text-blue-500 hover:underline"
                                >
                                    Create one now
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
