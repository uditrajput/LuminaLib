"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User } from "@/types/user";

interface ProfileCompletionModalProps {
    user: User | null;
}

export function ProfileCompletionModal({ user }: ProfileCompletionModalProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (pathname === "/profile") return; // Don't show if already on profile page
        
        // Show modal if profile is not completed and we haven't skipped it in this session
        const skipped = sessionStorage.getItem("profile_completion_skipped");
        if (user && !user.profile_completed && !skipped) {
            setIsOpen(true);
        }
    }, [user, pathname]);

    if (!isOpen) return null;

    const handleCompleteProfile = () => {
        setIsOpen(false);
        router.push("/profile");
    };

    const handleSkip = () => {
        sessionStorage.setItem("profile_completion_skipped", "true");
        setIsOpen(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                <div className="p-6">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Complete Your Profile</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                        To unlock the full potential of AI-powered book recommendations and personalized interactions, please complete your profile. The information you provide helps us understand your interests, education, hobbies, and preferences so we can recommend books that are more relevant to you.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-3 mt-8">
                        <button
                            onClick={handleSkip}
                            className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors w-full sm:w-auto"
                        >
                            Skip for Now
                        </button>
                        <button
                            onClick={handleCompleteProfile}
                            className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors w-full sm:w-auto flex-1 text-center flex items-center justify-center gap-2"
                        >
                            Complete Profile
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
