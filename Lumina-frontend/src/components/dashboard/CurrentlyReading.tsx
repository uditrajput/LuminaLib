import React from "react";
import { BorrowedBookInfo } from "@/types/user";
import { BookOpen, Clock, CalendarDays, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CurrentlyReadingProps {
    activeBorrow: BorrowedBookInfo;
}

export default function CurrentlyReading({ activeBorrow }: CurrentlyReadingProps) {
    const borrowedDate = new Date(activeBorrow.borrowed_at);
    
    // Simple mock calculation for display purposes
    const daysBorrowed = Math.floor((new Date().getTime() - borrowedDate.getTime()) / (1000 * 3600 * 24));
    
    return (
        <div className="bg-gradient-to-br from-primary/10 via-[var(--card)] to-[var(--card)] p-1 rounded-3xl shadow-sm">
            <div className="bg-[var(--card)]/90 backdrop-blur-sm rounded-[22px] p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center border border-[var(--border)]">
                
                {/* 3D Book Cover Presentation */}
                <div className="relative w-40 h-56 md:w-48 md:h-64 shrink-0 perspective-1000">
                    <div className="w-full h-full transform-gpu transition-all duration-500 rotate-y-[-10deg] hover:rotate-y-0 shadow-2xl rounded-r-lg rounded-l-sm">
                        <img 
                            src={activeBorrow.cover_image_url || "/default-book.png"} 
                            alt={activeBorrow.title}
                            className="w-full h-full object-cover rounded-r-lg rounded-l-sm"
                        />
                        {/* Book pages edge effect */}
                        <div className="absolute inset-y-0 right-0 w-[4px] bg-white/80 rounded-r-lg translate-x-[2px] translate-z-[-2px] skew-y-[-10deg]" />
                    </div>
                </div>

                <div className="flex-1 space-y-6">
                    <div>
                        <h2 className="text-sm font-semibold tracking-wider text-primary uppercase mb-2">Currently Reading</h2>
                        <h3 className="text-3xl font-bold">{activeBorrow.title}</h3>
                        <p className="text-xl text-muted-foreground mt-1">{activeBorrow.author || "Unknown Author"}</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1"><BookOpen className="w-3 h-3"/> Progress</span>
                            <span className="font-semibold">68%</span> {/* Mock value */}
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3"/> Time</span>
                            <span className="font-semibold">6h 24m</span> {/* Mock value */}
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1"><CalendarDays className="w-3 h-3"/> Borrowed</span>
                            <span className="font-semibold">{daysBorrowed} days ago</span>
                        </div>
                    </div>

                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                        <div className="bg-primary h-full w-[68%]" /> {/* Mock value matching progress */}
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                        <Button className="rounded-full px-6 gap-2">
                            Continue Reading <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
