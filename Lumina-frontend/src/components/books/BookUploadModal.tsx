"use client";

import React, { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { X, Upload, FileText, AlertCircle, CheckCircle2, Image as ImageIcon, Link as LinkIcon } from "lucide-react";

interface Props {
    onClose: () => void;
}

type CoverMode = "file" | "url";

export default function BookUploadModal({ onClose }: Props) {
    const fileRef = useRef<HTMLInputElement>(null);
    const coverFileRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [genre, setGenre] = useState("");
    const [year, setYear] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    // Cover image state
    const [coverMode, setCoverMode] = useState<CoverMode>("file");
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverUrl, setCoverUrl] = useState("");
    const [coverPreview, setCoverPreview] = useState<string | null>(null);

    const queryClient = useQueryClient();

    const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null;
        setCoverFile(f);
        if (f) {
            const reader = new FileReader();
            reader.onload = () => setCoverPreview(reader.result as string);
            reader.readAsDataURL(f);
        } else {
            setCoverPreview(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) { setError("Please select a book file."); return; }
        if (!title || !author || !genre || !year) { setError("All fields are required."); return; }

        setError(null);
        setLoading(true);

        try {
            const { default: apiClient } = await import("@/services/apiClient");
            const form = new FormData();
            form.append("file", file);
            form.append("title", title);
            form.append("author", author);
            form.append("genre", genre);
            form.append("year_published", year);
            if (description.trim()) form.append("description", description.trim());

            // Cover image: either file upload or URL
            if (coverMode === "file" && coverFile) {
                form.append("cover_image", coverFile);
            } else if (coverMode === "url" && coverUrl.trim()) {
                form.append("cover_image_url", coverUrl.trim());
            }

            await apiClient.post("/books", form, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            await queryClient.invalidateQueries({ queryKey: ["books"] });

            setSuccess(true);
            setTimeout(onClose, 1500);
        } catch (err: any) {
            setError(err?.response?.data?.detail || err?.message || "Upload failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const activeCoverPreview = coverMode === "file" ? coverPreview : coverUrl.trim() || null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                            <Upload className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Upload a Book</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">PDF or text files supported</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                    {error && (
                        <div className="flex items-center gap-2 p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-100 dark:border-red-500/20">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="flex items-center gap-2 p-3 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 rounded-xl border border-green-100 dark:border-green-500/20">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            Book uploaded successfully!
                        </div>
                    )}

                    {/* Book file drop zone */}
                    <div>
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 block">Book File *</label>
                        <div
                            onClick={() => fileRef.current?.click()}
                            className="border-2 border-dashed border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all group"
                        >
                            {file ? (
                                <div className="flex items-center justify-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                    <FileText className="h-5 w-5 text-blue-500" />
                                    {file.name}
                                </div>
                            ) : (
                                <>
                                    <Upload className="h-7 w-7 text-slate-300 dark:text-slate-600 group-hover:text-blue-400 dark:group-hover:text-blue-500 mx-auto mb-1.5 transition-colors" />
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Click to select file <span className="text-blue-600 font-medium">(.pdf, .txt)</span></p>
                                </>
                            )}
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".pdf,.txt"
                                className="hidden"
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            />
                        </div>
                    </div>

                    {/* Metadata fields */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 space-y-1">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Title *</label>
                            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Book title" className="h-10 rounded-xl" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Author *</label>
                            <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author name" className="h-10 rounded-xl" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Genre *</label>
                            <Input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="e.g. Fiction" className="h-10 rounded-xl" />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Year Published *</label>
                            <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2023" type="number" className="h-10 rounded-xl" />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Description <span className="font-normal text-slate-400 dark:text-slate-500">(optional)</span></label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="A brief description of the book…"
                                rows={3}
                                className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
                            />
                        </div>
                    </div>

                    {/* ── Cover Image Section ── */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                            <ImageIcon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                            Cover Image <span className="font-normal text-slate-400 dark:text-slate-500">(optional)</span>
                        </label>

                        {/* Tab switcher */}
                        <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
                            <button
                                type="button"
                                onClick={() => setCoverMode("file")}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 transition-colors ${coverMode === "file"
                                    ? "bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 font-semibold"
                                    : "bg-white dark:bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    }`}
                            >
                                <Upload className="h-3.5 w-3.5" />
                                Upload File
                            </button>
                            <button
                                type="button"
                                onClick={() => setCoverMode("url")}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border-l border-slate-200 dark:border-slate-700 transition-colors ${coverMode === "url"
                                    ? "bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 font-semibold"
                                    : "bg-white dark:bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    }`}
                            >
                                <LinkIcon className="h-3.5 w-3.5" />
                                URL
                            </button>
                        </div>

                        {/* File upload mode */}
                        {coverMode === "file" && (
                            <div
                                onClick={() => coverFileRef.current?.click()}
                                className="border-2 border-dashed border-slate-200 dark:border-slate-700/60 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-500/10 transition-all group"
                            >
                                {coverFile ? (
                                    <div className="flex items-center justify-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                        <ImageIcon className="h-5 w-5 text-emerald-500" />
                                        <span className="truncate max-w-[250px]">{coverFile.name}</span>
                                    </div>
                                ) : (
                                    <>
                                        <ImageIcon className="h-6 w-6 text-slate-300 dark:text-slate-600 group-hover:text-blue-400 dark:group-hover:text-blue-500 mx-auto mb-1 transition-colors" />
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Click to select image <span className="text-blue-600 font-medium">(.jpg, .png, .webp)</span></p>
                                    </>
                                )}
                                <input
                                    ref={coverFileRef}
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.webp,.gif,.svg"
                                    className="hidden"
                                    onChange={handleCoverFileChange}
                                />
                            </div>
                        )}

                        {/* URL mode */}
                        {coverMode === "url" && (
                            <Input
                                value={coverUrl}
                                onChange={(e) => setCoverUrl(e.target.value)}
                                placeholder="https://example.com/cover.jpg"
                                type="url"
                                className="h-10 rounded-xl"
                            />
                        )}

                        {/* Live preview */}
                        {activeCoverPreview && (
                            <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                <img
                                    src={activeCoverPreview}
                                    alt="Cover preview"
                                    className="h-20 w-14 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                />
                                <div>
                                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Cover Preview</p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">This will appear on the book card</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <Button type="submit" disabled={loading || success} className="w-full h-12 rounded-xl gap-2 font-semibold mt-2">
                        {loading ? "Uploading…" : success ? "Done!" : (
                            <><Upload className="h-4 w-4" /> Upload Book</>
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
