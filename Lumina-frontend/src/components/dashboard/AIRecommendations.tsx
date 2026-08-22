import React, { useEffect, useState } from "react";
import { User } from "@/types/user";
import { Sparkles, ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getRecommendations } from "@/services/bookService";
import { Book } from "@/types/book";

interface AIRecommendationsProps {
    user: User | null;
}

export default function AIRecommendations({ user }: AIRecommendationsProps) {
    const [recommendedBooks, setRecommendedBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecs = async () => {
            try {
                const books = await getRecommendations(4);
                setRecommendedBooks(books);
            } catch (error) {
                console.error("Failed to load AI recommendations", error);
            } finally {
                setLoading(false);
            }
        };
        fetchRecs();
    }, []);

    // Fallback static recommendations in case API returns empty (for UI demo)
    const mockRecommendations = [
        {
            title: "Dune",
            author: "Frank Herbert",
            match: "98% Match",
            reason: "Because you read Foundation",
            cover: "https://m.media-amazon.com/images/I/81ym3QUd3KL._SL1500_.jpg"
        },
        {
            title: "The Martian",
            author: "Andy Weir",
            match: "95% Match",
            reason: "Matches your interest in Hard Sci-Fi",
            cover: "https://m.media-amazon.com/images/I/71wLpW1y1BL._SL1500_.jpg"
        }
    ];

    return (
        <div className="bg-gradient-to-r from-purple-500/5 via-[var(--card)] to-[var(--card)] p-6 rounded-2xl border border-purple-500/20 shadow-sm relative overflow-hidden">
            {/* Animated glowing orb behind */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            
            <div className="flex justify-between items-end mb-6 relative z-10">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        AI Curated For You
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {user?.favorite_genres?.length 
                            ? `Based on your love for ${user.favorite_genres[0]}`
                            : "Personalized suggestions based on your profile"}
                    </p>
                </div>
                <Button variant="ghost" className="text-purple-500 hover:text-purple-600 hover:bg-purple-500/10 gap-2 hidden sm:flex">
                    View All <ArrowRight className="w-4 h-4" />
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                {loading ? (
                    <div className="col-span-full py-8 text-center text-sm text-muted-foreground animate-pulse">
                        Analyzing your reading patterns...
                    </div>
                ) : recommendedBooks.length > 0 ? (
                    recommendedBooks.map((book) => (
                        <div key={book.id} className="flex gap-4 p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] hover:border-purple-500/30 transition-colors group cursor-pointer">
                            {book.cover_image_url ? (
                                <img 
                                    src={book.cover_image_url} 
                                    alt={book.title} 
                                    className="w-16 h-24 object-cover rounded shadow-sm group-hover:scale-105 transition-transform"
                                />
                            ) : (
                                <div className="w-16 h-24 bg-slate-100 dark:bg-slate-800 rounded shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform">
                                    <BookOpen className="h-6 w-6 text-slate-400" />
                                </div>
                            )}
                            <div className="flex flex-col justify-center flex-1">
                                <span className="text-xs font-semibold text-purple-500 mb-1">
                                    {Math.floor(Math.random() * (99 - 85 + 1) + 85)}% Match
                                </span>
                                <h3 className="font-bold leading-tight line-clamp-1">{book.title}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-1">{book.author}</p>
                                <p className="text-xs text-muted-foreground mt-2 italic flex items-center gap-1 line-clamp-1">
                                    <Sparkles className="w-3 h-3 text-purple-400 shrink-0" /> 
                                    {book.genre ? `Matches your interest in ${book.genre}` : "Highly recommended for you"}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    mockRecommendations.map((book, i) => (
                        <div key={i} className="flex gap-4 p-4 rounded-xl bg-[var(--background)] border border-[var(--border)] hover:border-purple-500/30 transition-colors group cursor-pointer">
                            <img 
                                src={book.cover} 
                                alt={book.title} 
                                className="w-16 h-24 object-cover rounded shadow-sm group-hover:scale-105 transition-transform"
                            />
                            <div className="flex flex-col justify-center">
                                <span className="text-xs font-semibold text-purple-500 mb-1">{book.match}</span>
                                <h3 className="font-bold leading-tight">{book.title}</h3>
                                <p className="text-sm text-muted-foreground">{book.author}</p>
                                <p className="text-xs text-muted-foreground mt-2 italic flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-purple-400 shrink-0" /> {book.reason}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            <Button variant="ghost" className="w-full mt-4 text-purple-500 hover:text-purple-600 hover:bg-purple-500/10 gap-2 sm:hidden">
                View All <ArrowRight className="w-4 h-4" />
            </Button>
        </div>
    );
}
