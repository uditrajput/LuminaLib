import React, { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";

export default function DidYouKnow() {
    const facts = [
        "The longest novel ever written is 'Artamène ou le Grand Cyrus' containing over 2 million words.",
        "Reading for just 6 minutes a day can reduce stress levels by up to 68%.",
        "The word 'book' comes from the Old English 'boc', which originally meant 'beech' (a type of tree).",
        "Bill Gates reads about 50 books a year, which breaks down to about one a week."
    ];

    const [currentFactIndex, setCurrentFactIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentFactIndex((prev) => (prev + 1) % facts.length);
        }, 8000);
        return () => clearInterval(interval);
    }, [facts.length]);

    return (
        <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 p-5 rounded-2xl flex items-center gap-5 transition-all duration-500 shadow-sm">
            <div className="bg-indigo-500/20 p-2.5 rounded-xl shrink-0 shadow-inner">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
                <h3 className="text-sm font-extrabold text-indigo-900 dark:text-indigo-300 mb-1 tracking-wide uppercase">Did you know?</h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 transition-opacity duration-500 leading-relaxed">
                    {facts[currentFactIndex]}
                </p>
            </div>
        </div>
    );
}
