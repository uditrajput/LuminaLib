import React, { useState, useRef } from "react";
import { useBooks } from "@/hooks/useBooks";
import Book3DCard from "@/components/home/3d/Book3DCard";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NewBooksSection() {
    const [timeframe, setTimeframe] = useState<"week" | "month">("week");
    const { data, isLoading } = useBooks({ page: 1, limit: 10, catalog: "public" });
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -300, behavior: "smooth" });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 300, behavior: "smooth" });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-indigo-500" /> Newly Added Books
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">Discover fresh arrivals in the library</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-[var(--secondary)] rounded-full p-1 hidden sm:flex">
                        <button 
                            onClick={() => setTimeframe("week")}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${timeframe === "week" ? "bg-[var(--background)] shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            This Week
                        </button>
                        <button 
                            onClick={() => setTimeframe("month")}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${timeframe === "month" ? "bg-[var(--background)] shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            This Month
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={scrollLeft} className="p-2 rounded-full border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={scrollRight} className="p-2 rounded-full border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] p-8 shadow-sm">
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : data?.items?.length === 0 ? (
                    <div className="flex justify-center items-center h-64 text-muted-foreground">
                        No new books added recently.
                    </div>
                ) : (
                    <div 
                        ref={scrollContainerRef}
                        className="flex overflow-x-auto gap-8 pb-8 pt-4 px-4 snap-x snap-mandatory scrollbar-hide hide-scrollbar"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {data?.items.map((book) => (
                            <div key={book.id} className="snap-center shrink-0" onClick={() => router.push(`/books/${book.id}`)}>
                                <Book3DCard 
                                    title={book.title}
                                    author={book.author}
                                    genre={book.genre}
                                    rating={"4.5"}
                                    summary={book.description || "No description available."}
                                    coverUrl={book.cover_image_url || "/covers/default-book.png"}
                                    badge="New"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
