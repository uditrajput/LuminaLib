"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjs from "pdfjs-dist";
import {
    X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2,
    Volume2, VolumeX, Highlighter, Bookmark, Trash2, Loader2, AlertCircle, Sparkles,
    PanelLeft, Search, BookOpen, Layers, Frame
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import apiClient from "@/services/apiClient";

// Add Promise.withResolvers polyfill for pdfjs-dist@4
if (typeof window !== 'undefined' && typeof (Promise as any).withResolvers === 'undefined') {
    (Promise as any).withResolvers = function () {
        let resolve, reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { promise, resolve, reject };
    };
}

// Configure pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Book {
    id: number | string;
    title: string;
    author: string;
    file_name?: string;
}

interface Highlight {
    id: string;
    page: number;
    text: string;
    color: string; // hex
    colorName: string;
    timestamp: number;
}

interface PDFReaderModalProps {
    book: Book;
    onClose: () => void;
}

type FrameStyle = "hardcover" | "minimal" | "dark-glass" | "parchment" | "royal-navy" | "cyber-glow" | "mahogany" | "ring-binder";

const FRAME_STYLES_CONFIG: Record<FrameStyle, { name: string; icon: string; containerClass: string; innerBgClass: string }> = {
    hardcover: {
        name: "Leather Hardcover",
        icon: "📖",
        containerClass: "p-4 rounded-xl bg-gradient-to-br from-amber-950 via-stone-900 to-slate-950 border border-amber-900/40 shadow-[0_20px_50px_rgba(0,0,0,0.8),_0_0_0_1px_rgba(180,83,9,0.2),_12px_12px_0_-2px_rgba(230,225,215,0.9),_16px_16px_0_-4px_rgba(200,195,185,0.8),_20px_20px_0_-6px_rgba(170,165,155,0.7)]",
        innerBgClass: "bg-[#FDFBF7]",
    },
    minimal: {
        name: "Minimal Paper",
        icon: "📜",
        containerClass: "p-2 rounded-lg bg-white border border-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.15)]",
        innerBgClass: "bg-white",
    },
    "dark-glass": {
        name: "Dark Glass",
        icon: "🌌",
        containerClass: "p-4 rounded-2xl bg-slate-900/70 border border-purple-500/30 backdrop-blur-xl shadow-[0_0_30px_rgba(147,51,234,0.3)]",
        innerBgClass: "bg-slate-950",
    },
    parchment: {
        name: "Vintage Sepia",
        icon: "🍂",
        containerClass: "p-4 rounded-xl bg-gradient-to-br from-amber-900 via-yellow-950 to-amber-950 border border-amber-800/50 shadow-[0_15px_40px_rgba(0,0,0,0.6),_8px_8px_0_-2px_rgba(245,230,200,0.8)]",
        innerBgClass: "bg-[#f5e6ca]",
    },
    "royal-navy": {
        name: "Royal Navy",
        icon: "👑",
        containerClass: "p-4 rounded-xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 border border-amber-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.8),_0_0_0_1px_rgba(234,179,8,0.3),_10px_10px_0_-2px_rgba(240,235,225,0.9)]",
        innerBgClass: "bg-[#FAF9F5]",
    },
    "cyber-glow": {
        name: "Cyberpunk Glow",
        icon: "⚡",
        containerClass: "p-4 rounded-2xl bg-slate-950 border border-cyan-500/60 shadow-[0_0_35px_rgba(6,182,212,0.4)]",
        innerBgClass: "bg-slate-900",
    },
    mahogany: {
        name: "Mahogany Wood",
        icon: "🌲",
        containerClass: "p-4 rounded-xl bg-gradient-to-br from-amber-950 via-amber-900 to-yellow-950 border border-amber-900/60 shadow-[0_20px_40px_rgba(0,0,0,0.7),_8px_8px_0_-2px_rgba(235,220,190,0.8)]",
        innerBgClass: "bg-[#FFFDF7]",
    },
    "ring-binder": {
        name: "Ring Binder",
        icon: "📑",
        containerClass: "p-4 rounded-xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border border-slate-600 shadow-[0_15px_35px_rgba(0,0,0,0.5)]",
        innerBgClass: "bg-white",
    },
};

const HIGHLIGHT_COLORS = [
    { name: "Yellow", hex: "#fef08a", bgClass: "bg-yellow-200 text-yellow-900 border-yellow-300" },
    { name: "Green", hex: "#bbf7d0", bgClass: "bg-green-200 text-green-900 border-green-300" },
    { name: "Pink", hex: "#fbcfe8", bgClass: "bg-pink-200 text-pink-900 border-pink-300" },
    { name: "Blue", hex: "#bfdbfe", bgClass: "bg-blue-200 text-blue-900 border-blue-300" },
];

function PageThumbnailItem({ pdfDoc, pageNum, isCurrent, onClick }: { pdfDoc: any; pageNum: number; isCurrent: boolean; onClick: () => void }) {
    const thumbCanvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        let isCancelled = false;
        if (pdfDoc && thumbCanvasRef.current) {
            pdfDoc.getPage(pageNum).then((page: any) => {
                if (isCancelled) return;
                const viewport = page.getViewport({ scale: 0.45 });
                const canvas = thumbCanvasRef.current;
                if (!canvas) return;
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                page.render({ canvasContext: ctx, viewport }).promise.catch(() => {});
            }).catch(() => {});
        }
        return () => { isCancelled = true; };
    }, [pdfDoc, pageNum]);

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "w-full flex flex-col items-center p-3 rounded-2xl border text-center transition-all duration-200 group relative shrink-0",
                isCurrent
                    ? "bg-purple-950/80 border-purple-500 shadow-2xl ring-2 ring-purple-500/70 scale-[1.01]"
                    : "bg-slate-800/40 hover:bg-slate-800/90 border-slate-700/60 hover:border-slate-500"
            )}
        >
            {/* Large Canvas Thumbnail Container */}
            <div className="relative overflow-hidden rounded-xl border border-slate-600/50 bg-white shadow-xl flex justify-center items-center h-72 w-56 shrink-0 group-hover:shadow-2xl transition">
                <canvas ref={thumbCanvasRef} className="block max-h-full max-w-full" />
                <span className={cn(
                    "absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[10px] font-extrabold shadow-lg backdrop-blur-md",
                    isCurrent ? "bg-purple-600 text-white" : "bg-slate-900/80 text-slate-200"
                )}>
                    P. {pageNum}
                </span>
            </div>

            {/* Below Thumbnail: Page Number and Active Badge */}
            <div className="flex items-center justify-between w-full mt-2.5 px-1.5">
                <span className={cn("text-xs font-bold truncate", isCurrent ? "text-purple-300" : "text-slate-300 group-hover:text-white")}>
                    Page {pageNum}
                </span>
                {isCurrent && (
                    <span className="text-[10px] font-extrabold text-purple-200 bg-purple-600 px-2 py-0.5 rounded-full shadow-md border border-purple-400/40">
                        Active
                    </span>
                )}
            </div>
        </button>
    );
}


export default function PDFReaderModal({ book, onClose }: PDFReaderModalProps) {
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.2);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Frame style state
    const [frameStyle, setFrameStyle] = useState<FrameStyle>("hardcover");
    const [showFrameMenu, setShowFrameMenu] = useState<boolean>(false);

    // Left side panel, tab & search state
    const [showLeftPanel, setShowLeftPanel] = useState<boolean>(true);
    const [panelTab, setPanelTab] = useState<"thumbnails" | "text-search">("thumbnails");
    const [pageSearchQuery, setPageSearchQuery] = useState<string>("");
    const [fullTextQuery, setFullTextQuery] = useState<string>("");
    const [searchResults, setSearchResults] = useState<Array<{ page: number; snippet: string }>>([]);
    const [isSearchingText, setIsSearchingText] = useState<boolean>(false);


    // Text selection state
    const [selectedText, setSelectedText] = useState<string>("");
    const [selectionCoords, setSelectionCoords] = useState<{ x: number; y: number } | null>(null);
    const [isSpeakingSelection, setIsSpeakingSelection] = useState<boolean>(false);
    const [speakingHighlightId, setSpeakingHighlightId] = useState<string | null>(null);

    // Highlights state
    const [highlights, setHighlights] = useState<Highlight[]>([]);
    const [showHighlightsDrawer, setShowHighlightsDrawer] = useState<boolean>(false);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const textLayerRef = useRef<HTMLDivElement | null>(null);

    // Key local storage names
    const STORAGE_KEY_PAGE = `luminalib_pdf_page_${book.id}`;
    const STORAGE_KEY_HIGHLIGHTS = `luminalib_pdf_highlights_${book.id}`;
    const STORAGE_KEY_FRAME = `luminalib_pdf_frame_${book.id}`;

    // Load saved settings
    useEffect(() => {
        try {
            const savedPage = localStorage.getItem(STORAGE_KEY_PAGE);
            if (savedPage) {
                const parsed = parseInt(savedPage, 10);
                if (parsed > 0) setCurrentPage(parsed);
            }

            const savedHighlights = localStorage.getItem(STORAGE_KEY_HIGHLIGHTS);
            if (savedHighlights) {
                setHighlights(JSON.parse(savedHighlights));
            }

            const savedFrame = localStorage.getItem(STORAGE_KEY_FRAME) as FrameStyle;
            if (savedFrame && FRAME_STYLES_CONFIG[savedFrame]) {
                setFrameStyle(savedFrame);
            }
        } catch (e) {
            console.warn("Failed to load PDF reader settings from localStorage", e);
        }
    }, [book.id, STORAGE_KEY_PAGE, STORAGE_KEY_HIGHLIGHTS, STORAGE_KEY_FRAME]);

    // Save page change to localStorage
    const handlePageChange = useCallback((newPage: number) => {
        if (newPage < 1 || (numPages > 0 && newPage > numPages)) return;
        setCurrentPage(newPage);
        try {
            localStorage.setItem(STORAGE_KEY_PAGE, newPage.toString());
        } catch (e) {}
    }, [STORAGE_KEY_PAGE, numPages]);

    // Full text search across PDF document pages
    const executeTextSearch = useCallback(async (query: string) => {
        if (!pdfDoc || !query.trim()) {
            setSearchResults([]);
            return;
        }
        setIsSearchingText(true);
        const results: Array<{ page: number; snippet: string }> = [];
        const qLower = query.toLowerCase();

        for (let i = 1; i <= pdfDoc.numPages; i++) {
            try {
                const page = await pdfDoc.getPage(i);
                const textContent = await page.getTextContent();
                const text = textContent.items.map((item: any) => item.str).join(" ");
                const idx = text.toLowerCase().indexOf(qLower);
                if (idx !== -1) {
                    const start = Math.max(0, idx - 40);
                    const end = Math.min(text.length, idx + query.length + 40);
                    const snippet = text.slice(start, end);
                    results.push({ page: i, snippet });
                }
            } catch {
                // ignore
            }
        }
        setSearchResults(results);
        setIsSearchingText(false);
    }, [pdfDoc]);

    // Change frame style
    const changeFrameStyle = (style: FrameStyle) => {
        setFrameStyle(style);
        setShowFrameMenu(false);
        try {
            localStorage.setItem(STORAGE_KEY_FRAME, style);
        } catch (e) {}
    };

    // Save highlights to localStorage
    const saveHighlights = (newHighlights: Highlight[]) => {
        setHighlights(newHighlights);
        try {
            localStorage.setItem(STORAGE_KEY_HIGHLIGHTS, JSON.stringify(newHighlights));
        } catch (e) {}
    };

    // Load PDF document
    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);

        const fetchPdf = async () => {
            try {
                const response = await apiClient.get(`/books/${book.id}/file`, {
                    responseType: "arraybuffer",
                });

                const loadingTask = pdfjs.getDocument({ data: new Uint8Array(response.data) });
                const pdf = await loadingTask.promise;
                if (!isMounted) return;

                setPdfDoc(pdf);
                setNumPages(pdf.numPages);
                setLoading(false);
            } catch (err: any) {
                if (!isMounted) return;
                console.error("Error loading PDF:", err);
                
                let errorMessage = err?.message || "Failed to load PDF document.";
                if (err?.response?.data instanceof ArrayBuffer) {
                    try {
                        const decodedString = new TextDecoder().decode(err.response.data);
                        const parsed = JSON.parse(decodedString);
                        if (parsed.detail) {
                            errorMessage = parsed.detail;
                        }
                    } catch (e) {
                        // ignore decode errors
                    }
                } else if (err?.response?.data?.detail) {
                    errorMessage = err.response.data.detail;
                }
                
                setError(errorMessage);
                setLoading(false);
            }
        };

        fetchPdf();
        return () => { isMounted = false; };
    }, [book.id]);

    // Render current page onto canvas
    const renderPage = useCallback(async () => {
        if (!pdfDoc || !canvasRef.current) return;

        try {
            const page = await pdfDoc.getPage(currentPage);
            const viewport = page.getViewport({ scale });

            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");
            if (!context) return;

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: viewport,
            };

            await page.render(renderContext).promise;

            // Extract text content for selection layer
            if (textLayerRef.current) {
                const textContent = await page.getTextContent();
                const textLayerDiv = textLayerRef.current;
                textLayerDiv.innerHTML = "";
                textLayerDiv.style.width = `${viewport.width}px`;
                textLayerDiv.style.height = `${viewport.height}px`;

                // Render text items as spans for clean mouse selection
                textContent.items.forEach((item: any) => {
                    const tx = pdfjs.Util.transform(viewport.transform, item.transform);
                    const fontHeight = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);

                    const span = document.createElement("span");
                    span.textContent = item.str + (item.hasEOL ? "\n" : " ");
                    span.style.left = `${tx[4]}px`;
                    span.style.top = `${tx[5] - fontHeight}px`;
                    span.style.fontSize = `${fontHeight}px`;
                    span.style.fontFamily = item.fontName || "sans-serif";
                    span.style.position = "absolute";
                    span.style.transformOrigin = "0% 0%";
                    span.className = "select-text hover:bg-yellow-100/30 cursor-text transition-colors";
                    textLayerDiv.appendChild(span);
                });
            }
        } catch (e) {
            console.error("Render page error:", e);
        }
    }, [pdfDoc, currentPage, scale]);

    useEffect(() => {
        renderPage();
    }, [renderPage]);

    // Handle text selection
    const handleMouseUp = () => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();

        if (text && text.length > 0) {
            setSelectedText(text);
            const range = selection?.getRangeAt(0);
            if (range && containerRef.current) {
                const rect = range.getBoundingClientRect();
                const containerRect = containerRef.current.getBoundingClientRect();
                setSelectionCoords({
                    x: rect.left - containerRect.left + rect.width / 2,
                    y: rect.top - containerRect.top - 50,
                });
            }
        } else {
            setSelectedText("");
            setSelectionCoords(null);
        }
    };

    // Text to speech for selection or highlight
    const speakText = (text: string, highlightId?: string) => {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onstart = () => {
                setIsSpeakingSelection(true);
                setSpeakingHighlightId(highlightId || null);
            };
            utterance.onend = () => {
                setIsSpeakingSelection(false);
                setSpeakingHighlightId(null);
            };
            utterance.onerror = () => {
                setIsSpeakingSelection(false);
                setSpeakingHighlightId(null);
            };
            window.speechSynthesis.speak(utterance);
        }
    };

    const stopSpeech = () => {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }
        setIsSpeakingSelection(false);
        setSpeakingHighlightId(null);
    };

    // Add highlight
    const addHighlight = (colorHex: string, colorName: string) => {
        if (!selectedText) return;
        const cleanedText = selectedText.replace(/([a-z0-9,.;:!?])([A-Z])/g, "$1 $2").replace(/\s+/g, " ").trim();
        const newHighlight: Highlight = {
            id: Date.now().toString(),
            page: currentPage,
            text: cleanedText,
            color: colorHex,
            colorName: colorName,
            timestamp: Date.now(),
        };

        saveHighlights([newHighlight, ...highlights]);
        setSelectedText("");
        setSelectionCoords(null);
        window.getSelection()?.removeAllRanges();
    };

    // Delete highlight
    const deleteHighlight = (id: string) => {
        saveHighlights(highlights.filter((h) => h.id !== id));
    };

    // Filter pages for left panel search
    const pagesList = Array.from({ length: numPages }, (_, i) => i + 1);
    const filteredPages = pageSearchQuery.trim()
        ? pagesList.filter((p) => p.toString().includes(pageSearchQuery.trim()))
        : pagesList;

    const currentFrameConfig = FRAME_STYLES_CONFIG[frameStyle] || FRAME_STYLES_CONFIG.hardcover;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-md animate-fade-in">
            {/* Top Navigation & Toolbar Bar */}
            <div className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800 text-white shrink-0 shadow-lg">
                {/* Book Details & Left Panel Toggle */}
                <div className="flex items-center gap-3">
                    {!loading && !error && (
                        <button
                            type="button"
                            onClick={() => setShowLeftPanel(!showLeftPanel)}
                            className={cn(
                                "p-2 rounded-xl border transition flex items-center gap-1.5 text-xs font-bold",
                                showLeftPanel
                                    ? "bg-purple-600/30 border-purple-500 text-purple-300"
                                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                            )}
                            title={showLeftPanel ? "Hide Page Thumbnails" : "Show Page Thumbnails"}
                        >
                            <PanelLeft className="h-4 w-4" />
                            <span className="hidden sm:inline">Thumbnails</span>
                        </button>
                    )}

                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                            <Bookmark className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold truncate max-w-xs sm:max-w-md">{book.title}</h2>
                            <p className="text-[11px] text-slate-400">{book.author}</p>
                        </div>
                    </div>
                </div>

                {/* Reader Controls (Page, Zoom & Frame Selector) */}
                {!loading && !error && (
                    <div className="flex items-center gap-3">
                        {/* Page Navigation */}
                        <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                            <button
                                type="button"
                                disabled={currentPage <= 1}
                                onClick={() => handlePageChange(currentPage - 1)}
                                className="p-1 hover:bg-slate-700 disabled:opacity-30 rounded-lg transition"
                                title="Previous Page"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-xs font-semibold px-2">
                                Page {currentPage} of {numPages}
                            </span>
                            <button
                                type="button"
                                disabled={currentPage >= numPages}
                                onClick={() => handlePageChange(currentPage + 1)}
                                className="p-1 hover:bg-slate-700 disabled:opacity-30 rounded-lg transition"
                                title="Next Page"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Zoom Controls */}
                        <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1.5 rounded-xl border border-slate-700">
                            <button
                                type="button"
                                onClick={() => setScale((prev) => Math.max(0.6, prev - 0.2))}
                                className="p-1 hover:bg-slate-700 rounded-lg transition"
                                title="Zoom Out"
                            >
                                <ZoomOut className="h-4 w-4" />
                            </button>
                            <span className="text-xs font-semibold px-2 w-12 text-center">
                                {Math.round(scale * 100)}%
                            </span>
                            <button
                                type="button"
                                onClick={() => setScale((prev) => Math.min(3.0, prev + 0.2))}
                                className="p-1 hover:bg-slate-700 rounded-lg transition"
                                title="Zoom In"
                            >
                                <ZoomIn className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setScale(1.2)}
                                className="p-1 hover:bg-slate-700 rounded-lg transition text-slate-400"
                                title="Reset Zoom"
                            >
                                <Maximize2 className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        {/* Frame Style Selector */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowFrameMenu(!showFrameMenu)}
                                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold transition"
                                title="Choose Book Frame Style"
                            >
                                <Frame className="h-4 w-4 text-indigo-400" />
                                <span className="hidden md:inline">{currentFrameConfig.icon} {currentFrameConfig.name}</span>
                            </button>

                            {showFrameMenu && (
                                <div className="absolute right-0 top-11 z-50 w-52 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 space-y-1 animate-fade-in">
                                    <p className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">Choose Frame Style</p>
                                    {(Object.keys(FRAME_STYLES_CONFIG) as FrameStyle[]).map((st) => (
                                        <button
                                            key={st}
                                            type="button"
                                            onClick={() => changeFrameStyle(st)}
                                            className={cn(
                                                "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition font-semibold",
                                                frameStyle === st
                                                    ? "bg-purple-600 text-white shadow-md"
                                                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                            )}
                                        >
                                            <span className="flex items-center gap-2">
                                                <span>{FRAME_STYLES_CONFIG[st].icon}</span>
                                                <span>{FRAME_STYLES_CONFIG[st].name}</span>
                                            </span>
                                            {frameStyle === st && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Saved Highlights Drawer Toggle */}
                        <button
                            type="button"
                            onClick={() => setShowHighlightsDrawer(!showHighlightsDrawer)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border",
                                showHighlightsDrawer
                                    ? "bg-purple-600 text-white border-purple-500 shadow-md"
                                    : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                            )}
                        >
                            <Highlighter className="h-4 w-4 text-amber-400" />
                            <span>Highlights ({highlights.length})</span>
                        </button>
                    </div>
                )}

                {/* Close Button */}
                <button
                    type="button"
                    onClick={() => {
                        stopSpeech();
                        onClose();
                    }}
                    className="p-2 hover:bg-slate-800 rounded-xl transition text-slate-400 hover:text-white ml-2"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Main Reader Layout */}
            <div className="flex-1 flex overflow-hidden relative group/page">
                {/* Left Side Panel: Visual Page Thumbnails & Full-Text Search */}
                {showLeftPanel && !loading && !error && (
                    <div className="w-80 bg-slate-900/95 border-r border-slate-800 flex flex-col h-full shadow-2xl animate-fade-in shrink-0 z-20">
                        {/* Header with Title, Close/Hide Button, Tabs and Search Bar */}

                        <div className="p-3.5 border-b border-slate-800 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                                    <Layers className="h-4 w-4 text-purple-400" />
                                    <span>Document Navigator</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowLeftPanel(false)}
                                    className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
                                    title="Hide Panel"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Tab Switcher: Thumbnails vs Text Search */}
                            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setPanelTab("thumbnails")}
                                    className={cn(
                                        "flex-1 py-1 px-2 rounded-lg font-semibold transition text-center",
                                        panelTab === "thumbnails"
                                            ? "bg-purple-600 text-white shadow-md"
                                            : "text-slate-400 hover:text-slate-200"
                                    )}
                                >
                                    Pages ({numPages})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPanelTab("text-search")}
                                    className={cn(
                                        "flex-1 py-1 px-2 rounded-lg font-semibold transition text-center",
                                        panelTab === "text-search"
                                            ? "bg-purple-600 text-white shadow-md"
                                            : "text-slate-400 hover:text-slate-200"
                                    )}
                                >
                                    Search Text
                                </button>
                            </div>

                            {/* Active Tab Input */}
                            {panelTab === "thumbnails" ? (
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={pageSearchQuery}
                                        onChange={(e) => setPageSearchQuery(e.target.value)}
                                        placeholder="Filter by page number…"
                                        className="w-full bg-slate-800 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                        <input
                                            type="text"
                                            value={fullTextQuery}
                                            onChange={(e) => setFullTextQuery(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") executeTextSearch(fullTextQuery);
                                            }}
                                            placeholder="Find text inside book…"
                                            className="w-full bg-slate-800 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => executeTextSearch(fullTextQuery)}
                                        className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shrink-0"
                                    >
                                        Find
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Content Area */}
                        {panelTab === "thumbnails" ? (
                            /* Single Column Page Thumbnails (1 thumbnail per row) */
                            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar">
                                {filteredPages.length === 0 ? (
                                    <p className="text-center text-xs text-slate-500 py-8">No matching page found.</p>
                                ) : (
                                    filteredPages.map((pg) => (
                                        <PageThumbnailItem
                                            key={pg}
                                            pdfDoc={pdfDoc}
                                            pageNum={pg}
                                            isCurrent={pg === currentPage}
                                            onClick={() => handlePageChange(pg)}
                                        />
                                    ))
                                )}
                            </div>
                        ) : (
                            /* Full-Text Search Results List */
                            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 custom-scrollbar">
                                {isSearchingText ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                                        <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                                        <span className="text-xs">Searching document text…</span>
                                    </div>
                                ) : searchResults.length === 0 ? (
                                    <p className="text-center text-xs text-slate-500 py-8">
                                        {fullTextQuery ? "No matches found in document." : "Enter keyword and press Find."}
                                    </p>
                                ) : (
                                    searchResults.map((res, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handlePageChange(res.page)}
                                            className="p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 text-left transition space-y-1 group"
                                        >
                                            <div className="flex items-center justify-between text-[11px] font-bold text-purple-300">
                                                <span>Page {res.page}</span>
                                                <span className="text-[10px] text-slate-400 group-hover:text-purple-400">Jump &rarr;</span>
                                            </div>
                                            <p className="text-xs text-slate-300 line-clamp-3 italic leading-snug">
                                                &ldquo;…{res.snippet}…&rdquo;
                                            </p>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}


                {/* PDF Viewer Body with Dynamic Book Frame */}
                <div
                    ref={containerRef}
                    onMouseUp={handleMouseUp}
                    className="flex-1 overflow-auto p-12 flex justify-center items-start bg-slate-950/80 custom-scrollbar relative"
                >

                    {loading && (
                        <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                            <p className="text-sm">Loading PDF document…</p>
                        </div>
                    )}

                    {error && (
                        <div className="flex flex-col items-center justify-center h-64 gap-3 text-red-400 bg-red-950/20 p-8 rounded-2xl border border-red-900/40 max-w-md">
                            <AlertCircle className="h-8 w-8" />
                            <p className="text-sm font-semibold text-center">{error}</p>
                        </div>
                    )}

                    {!loading && !error && (
                        /* Selected Book Frame Container */
                        <div className="relative group/frame transition-all duration-300 my-4">

                            {/* Floating Glassmorphism Left Navigation Button (Anchored next to frame) */}
                            <button
                                type="button"
                                disabled={currentPage <= 1}
                                onClick={() => handlePageChange(currentPage - 1)}
                                className="absolute -left-16 top-1/2 -translate-y-1/2 z-40 p-3.5 rounded-full bg-slate-900/85 hover:bg-purple-600 text-white border border-white/20 backdrop-blur-md shadow-2xl transition-all duration-300 opacity-0 group-hover/frame:opacity-100 hover:scale-110 active:scale-95 disabled:hidden"
                                title="Previous Page"
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </button>

                            {/* Floating Glassmorphism Right Navigation Button (Anchored next to frame) */}
                            <button
                                type="button"
                                disabled={currentPage >= numPages}
                                onClick={() => handlePageChange(currentPage + 1)}
                                className="absolute -right-16 top-1/2 -translate-y-1/2 z-40 p-3.5 rounded-full bg-slate-900/85 hover:bg-purple-600 text-white border border-white/20 backdrop-blur-md shadow-2xl transition-all duration-300 opacity-0 group-hover/frame:opacity-100 hover:scale-110 active:scale-95 disabled:hidden"
                                title="Next Page"
                            >
                                <ChevronRight className="h-6 w-6" />
                            </button>

                            <div className={cn("relative transition-all duration-300", currentFrameConfig.containerClass)}>
                                {/* Book Spine Crease Effect for Hardcover & Parchment */}
                                {(frameStyle === "hardcover" || frameStyle === "parchment") && (
                                    <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-20 pointer-events-none rounded-l-xl border-r border-amber-900/30" />
                                )}

                                {/* Inner Page Canvas Wrapper */}
                                <div className={cn("relative rounded-sm overflow-hidden shadow-inner", currentFrameConfig.innerBgClass)}>
                                    <canvas ref={canvasRef} className="block" />
                                    <div
                                        ref={textLayerRef}
                                        className="absolute inset-0 pointer-events-auto opacity-40 select-text"
                                    />
                                </div>
                            </div>
                        </div>
                    )}


                    {/* Floating Text Selection Action Tooltip */}
                    {selectedText && selectionCoords && (
                        <div
                            style={{
                                left: `${selectionCoords.x}px`,
                                top: `${selectionCoords.y}px`,
                            }}
                            className="absolute z-40 -translate-x-1/2 flex items-center gap-2 bg-slate-900 text-white border border-purple-500/50 px-3 py-2 rounded-2xl shadow-2xl animate-fade-in"
                        >
                            {/* Read Selection Aloud */}
                            {isSpeakingSelection && !speakingHighlightId ? (
                                <button
                                    type="button"
                                    onClick={stopSpeech}
                                    className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl transition flex items-center gap-1 text-xs font-semibold"
                                    title="Stop Speaking"
                                >
                                    <VolumeX className="h-4 w-4 animate-pulse" />
                                    <span>Stop</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => speakText(selectedText)}
                                    className="p-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl transition flex items-center gap-1 text-xs font-semibold"
                                    title="Read Selected Text"
                                >
                                    <Volume2 className="h-4 w-4" />
                                    <span>Speak</span>
                                </button>
                            )}

                            <div className="h-4 w-px bg-slate-700 mx-1" />

                            {/* Color Highlighters */}
                            <span className="text-[10px] uppercase font-extrabold text-slate-400 mr-0.5">Highlight:</span>
                            <div className="flex items-center gap-1.5">
                                {HIGHLIGHT_COLORS.map((c) => (
                                    <button
                                        key={c.name}
                                        type="button"
                                        onClick={() => addHighlight(c.hex, c.name)}
                                        className="h-5 w-5 rounded-full border border-white/20 hover:scale-125 transition-transform"
                                        style={{ backgroundColor: c.hex }}
                                        title={`Highlight in ${c.name}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Highlights Sidebar Drawer */}
                {showHighlightsDrawer && (
                    <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl animate-fade-in z-30 shrink-0">
                        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-white font-bold text-sm">
                                <Highlighter className="h-4 w-4 text-amber-400" />
                                <span>Saved Highlights</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowHighlightsDrawer(false)}
                                className="p-1 text-slate-400 hover:text-white rounded-lg"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {highlights.length === 0 ? (
                                <div className="text-center py-12 text-slate-500 text-xs space-y-2">
                                    <Sparkles className="h-6 w-6 mx-auto text-slate-600" />
                                    <p>No highlights yet.</p>
                                    <p className="text-[11px] text-slate-600">Select any text in the book to highlight or read it aloud.</p>
                                </div>
                            ) : (
                                highlights.map((hl) => {
                                    const isThisHighlightSpeaking = speakingHighlightId === hl.id && isSpeakingSelection;
                                    return (
                                        <div
                                            key={hl.id}
                                            className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3.5 space-y-2 text-xs shadow-sm hover:border-purple-500/50 transition"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <span
                                                        className="h-2.5 w-2.5 rounded-full"
                                                        style={{ backgroundColor: hl.color }}
                                                    />
                                                    <span className="font-bold text-slate-300">Page {hl.page}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePageChange(hl.page)}
                                                        className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md text-[10px] font-semibold"
                                                    >
                                                        Go to Page
                                                    </button>
                                                    {/* Speaker / Stop Toggle Icon Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (isThisHighlightSpeaking) {
                                                                stopSpeech();
                                                            } else {
                                                                speakText(hl.text, hl.id);
                                                            }
                                                        }}
                                                        className={cn(
                                                            "p-1 rounded transition",
                                                            isThisHighlightSpeaking
                                                                ? "text-red-400 hover:text-red-300 bg-red-950/40"
                                                                : "text-purple-400 hover:text-purple-300 hover:bg-purple-950/40"
                                                        )}
                                                        title={isThisHighlightSpeaking ? "Stop Reading" : "Read Aloud"}
                                                    >
                                                        {isThisHighlightSpeaking ? (
                                                            <VolumeX className="h-3.5 w-3.5 animate-pulse" />
                                                        ) : (
                                                            <Volume2 className="h-3.5 w-3.5" />
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteHighlight(hl.id)}
                                                        className="p-1 text-slate-500 hover:text-red-400 rounded"
                                                        title="Delete Highlight"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                            <p
                                                className="p-2.5 rounded-xl text-slate-900 leading-relaxed font-medium italic border text-xs break-words"
                                                style={{ backgroundColor: hl.color }}
                                            >
                                                &ldquo;{hl.text}&rdquo;
                                            </p>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
