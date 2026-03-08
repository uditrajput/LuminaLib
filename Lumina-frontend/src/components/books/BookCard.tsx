import React from "react";
import { Book } from "@/types/book";
import { BookOpen, User as Author, Calendar, Tag, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Genre → glow color mapping (border + shadow colors)
const GENRE_GLOW: Record<string, { border: string; shadow: string; badge: string }> = {
    fiction: { border: "from-violet-500 via-purple-500 to-violet-400", shadow: "shadow-violet-500/20", badge: "bg-violet-100 text-violet-700" },
    "non-fiction": { border: "from-amber-500 via-orange-400 to-amber-400", shadow: "shadow-amber-500/20", badge: "bg-amber-100 text-amber-700" },
    science: { border: "from-cyan-500 via-teal-400 to-cyan-400", shadow: "shadow-cyan-500/20", badge: "bg-cyan-100 text-cyan-700" },
    history: { border: "from-orange-500 via-amber-500 to-orange-400", shadow: "shadow-orange-500/20", badge: "bg-orange-100 text-orange-700" },
    biography: { border: "from-emerald-500 via-green-400 to-emerald-400", shadow: "shadow-emerald-500/20", badge: "bg-emerald-100 text-emerald-700" },
    romance: { border: "from-pink-500 via-rose-400 to-pink-400", shadow: "shadow-pink-500/20", badge: "bg-pink-100 text-pink-700" },
    thriller: { border: "from-red-500 via-rose-500 to-red-400", shadow: "shadow-red-500/20", badge: "bg-red-100 text-red-700" },
    fantasy: { border: "from-indigo-500 via-blue-500 to-indigo-400", shadow: "shadow-indigo-500/20", badge: "bg-indigo-100 text-indigo-700" },
    python: { border: "from-blue-500 via-indigo-500 to-blue-400", shadow: "shadow-blue-500/20", badge: "bg-blue-100 text-blue-700" },
    default: { border: "from-rose-500 via-red-500 to-orange-400", shadow: "shadow-rose-500/20", badge: "bg-slate-100 text-slate-700" },
};

function genreGlow(genre?: string) {
    if (!genre) return GENRE_GLOW.default;
    const key = genre.toLowerCase();
    return GENRE_GLOW[key] ?? GENRE_GLOW.default;
}

interface BookCardProps {
    book: Readonly<Book>;
}

export function BookCard({ book }: BookCardProps) {
    const glow = genreGlow(book.genre);

    return (
        <Link href={`/books/${book.id}`} className="group block h-full">
            {/* Outer glow wrapper */}
            <div className={cn(
                "relative rounded-2xl p-[2px] h-full transition-all duration-500",
                "bg-gradient-to-br", glow.border,
                "opacity-60 group-hover:opacity-100",
                "shadow-lg group-hover:shadow-xl", glow.shadow,
            )}>
                {/* Animated glow ring */}
                <div className={cn(
                    "absolute -inset-[1px] rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-40 blur-md transition-opacity duration-500 -z-10",
                    glow.border,
                )} />

                {/* Inner card — pure white */}
                <article className="relative bg-white rounded-[14px] h-full overflow-hidden flex flex-col">
                    {/* Cover area */}
                    <div className="relative h-44 bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100 flex items-center justify-center overflow-hidden">
                        {book.cover_image_url ? (
                            <img
                                src={book.cover_image_url}
                                alt={book.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                            />
                        ) : (
                            <BookOpen className="h-14 w-14 text-slate-200 group-hover:text-blue-300 group-hover:scale-110 transition-all duration-500" />
                        )}

                        {/* Genre badge overlaid */}
                        {book.genre && (
                            <div className={cn(
                                "absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm",
                                glow.badge,
                            )}>
                                <Tag className="h-2.5 w-2.5" />
                                {book.genre}
                            </div>
                        )}

                        {/* Arrow on hover */}
                        <div className="absolute top-3 right-3 h-7 w-7 rounded-full bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <ArrowUpRight className="h-4 w-4 text-blue-600" />
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-5 flex flex-col flex-1 gap-3">
                        <div>
                            <h3 className="font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors text-sm mb-1">
                                {book.title}
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Author className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="line-clamp-1">{book.author}</span>
                            </div>
                        </div>

                        {book.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{book.description}</p>
                        )}

                        <div className="flex items-center gap-3 mt-auto pt-3 border-t border-slate-100 text-xs text-slate-400">
                            {book.year_published && (
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {book.year_published}
                                </div>
                            )}
                        </div>
                    </div>
                </article>
            </div>
        </Link>
    );
}
