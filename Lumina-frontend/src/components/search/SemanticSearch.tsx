"use client";
import { useState } from "react";
import { Search, BookOpen } from "lucide-react";
import { searchService } from "@/services/searchService";

export function SemanticSearch({ onJump }: { onJump?: (bookId: number, query: string) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const search = async () => {
    if (q.trim().length < 2) return;
    setLoading(true);
    try {
      const data = await searchService.hybrid(q);
      setResults(data.results || []);
    } finally { setLoading(false); }
  };
  return (
    <div className="rounded-2xl border bg-[var(--card)] p-4">
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 border rounded-xl px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} placeholder="Semantic search: ask anything (e.g. 'deadlock prevention in OS')" className="flex-1 bg-transparent outline-none text-sm" />
        </div>
        <button onClick={search} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">{loading ? "..." : "Search"}</button>
      </div>
      {results.length > 0 && (
        <div className="mt-3 space-y-2 max-h-72 overflow-auto">
          {results.map((r, i) => (
            <div key={i} className="p-3 border rounded-xl hover:bg-slate-50 cursor-pointer" onClick={() => onJump?.(r.book_id, q)}>
              <p className="text-sm font-medium flex items-center gap-2"><BookOpen className="h-3 w-3" />{r.book_title} <span className="text-xs text-muted-foreground">score {r.score}</span></p>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{r.content?.slice(0, 220)}</p>
              <p className="text-[11px] text-indigo-600 mt-1">Click to open book & jump →</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
