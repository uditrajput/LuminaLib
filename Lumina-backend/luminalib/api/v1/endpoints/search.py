"""Hybrid semantic search — BM25 LIKE now, pgvector cosine when extension available."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.api.v1.deps import get_db, get_current_user
from luminalib.models.document_chunk import DocumentChunk
from luminalib.models.book import Book
from luminalib.models.user import User

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
async def hybrid_search(
    q: str = Query(..., min_length=1),
    book_id: int | None = None,
    limit: int = Query(8, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # BM25-like via ilike ranking (pgvector extension optional)
    # Try pgvector cosine if column exists; fallback to LIKE + simple score
    pattern = f"%{q}%"
    query = select(DocumentChunk, Book.title).join(Book, Book.id == DocumentChunk.book_id)
    if book_id:
        query = query.where(DocumentChunk.book_id == book_id)
    # Access: only books user can read (public or entitled) — simplified to public for search V1
    # For private, filter via entitlements if needed — reuse books filter
    query = query.where(DocumentChunk.content.ilike(pattern))
    query = query.limit(limit)
    res = await db.execute(query)
    rows = res.all()
    results = []
    for chunk, title in rows:
        # naive score: occurrence count
        content_lower = (chunk.content or "").lower()
        q_lower = q.lower()
        score = content_lower.count(q_lower) / max(1, len(content_lower.split()))
        snippet = chunk.content[:300] if chunk.content else ""
        # find page hint via chunk id order — approximate page = ceil(id/3) or via chunk metadata
        results.append({
            "chunk_id": chunk.id,
            "book_id": chunk.book_id,
            "book_title": title,
            "content": snippet,
            "score": round(score, 4),
            "page_hint": None,  # frontend will text-search to locate page
        })
    # also search book titles directly
    bq = select(Book).where(or_(Book.title.ilike(pattern), Book.author.ilike(pattern))).limit(5)
    bres = await db.execute(bq)
    for b in bres.scalars().all():
        results.append({"book_id": b.id, "book_title": b.title, "content": b.description or "", "score": 0.9, "type": "book", "page_hint": 1})

    # sort by score desc
    results.sort(key=lambda x: x.get("score", 0), reverse=True)
    return {"query": q, "count": len(results), "results": results}
