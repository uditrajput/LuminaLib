"""Reading progress & highlights — P0 telemetry (minimal)."""

from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.api.v1.deps import get_db, get_current_user
from luminalib.models.reading_session import ReadingSession
from luminalib.models.highlight import Highlight, Bookmark
from luminalib.models.user import User

router = APIRouter(prefix="/progress", tags=["progress"])


class ProgressIn(BaseModel):
    book_id: int
    pages_read: int | None = None
    progress_pct: float | None = None
    duration_seconds: int | None = None


@router.post("", summary="Upsert reading progress")
async def upsert_progress(req: ProgressIn, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    # find latest session for this user+book, update or create
    res = await db.execute(select(ReadingSession).where(ReadingSession.user_id == user.id, ReadingSession.book_id == req.book_id).order_by(ReadingSession.started_at.desc()).limit(1))
    sess = res.scalar_one_or_none()
    if sess and sess.ended_at is None:
        if req.pages_read is not None:
            sess.pages_read = req.pages_read
        if req.progress_pct is not None:
            sess.progress_pct = req.progress_pct
        if req.duration_seconds is not None:
            sess.duration_seconds = (sess.duration_seconds or 0) + req.duration_seconds
    else:
        sess = ReadingSession(user_id=user.id, book_id=req.book_id, pages_read=req.pages_read or 0, progress_pct=req.progress_pct or 0, duration_seconds=req.duration_seconds or 0)
        db.add(sess)
    await db.commit()
    await db.refresh(sess)
    return sess


@router.get("/stats", summary="Gamification stats: streak, XP, level")
async def progress_stats(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    from sqlalchemy import func
    from luminalib.models.borrow import BookBorrow
    # total reading time
    total_time = (await db.execute(select(func.sum(ReadingSession.duration_seconds)).where(ReadingSession.user_id == user.id))).scalar() or 0
    total_sessions = (await db.execute(select(func.count(ReadingSession.id)).where(ReadingSession.user_id == user.id))).scalar() or 0
    # streak: count distinct days with sessions in last 30 days consecutively
    # simple: distinct dates
    res = await db.execute(select(ReadingSession.started_at).where(ReadingSession.user_id == user.id).order_by(ReadingSession.started_at.desc()).limit(100))
    dates = sorted({r[0].date() for r in res.fetchall() if r[0]}, reverse=True)
    streak = 0
    from datetime import date, timedelta
    cur = date.today()
    for d in dates:
        if d == cur - timedelta(days=streak):
            streak += 1
        else:
            break
    # XP: 10 per returned, 2 per session, 5 per streak day
    returned = (await db.execute(select(func.count(BookBorrow.id)).where(BookBorrow.user_id == user.id, BookBorrow.returned_at.isnot(None)))).scalar() or 0
    xp = returned * 10 + total_sessions * 2 + streak * 5
    level = xp // 100 + 1
    # badges
    badges = []
    if returned >= 1: badges.append("First Return")
    if returned >= 5: badges.append("5 Books")
    if returned >= 10: badges.append("Champion")
    if streak >= 3: badges.append(f"{streak}-Day Streak")
    if total_time >= 3600: badges.append("Hour Reader")
    return {"total_time_seconds": total_time, "total_sessions": total_sessions, "streak_days": streak, "xp": xp, "level": level, "badges": badges, "returned": returned}


@router.get("", summary="List my reading sessions")
async def list_progress(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    res = await db.execute(select(ReadingSession).where(ReadingSession.user_id == user.id).order_by(ReadingSession.started_at.desc()).limit(50))
    return list(res.scalars().all())


# Highlights
class HighlightIn(BaseModel):
    book_id: int
    page: int
    text: str
    rects: dict | None = None
    note: str | None = None
    color: str | None = None


@router.post("/highlights", summary="Create highlight")
async def create_highlight(req: HighlightIn, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    h = Highlight(user_id=user.id, book_id=req.book_id, page=req.page, text=req.text, rects=req.rects, note=req.note, color=req.color)
    db.add(h)
    await db.commit()
    await db.refresh(h)
    return h


@router.get("/highlights/{book_id}")
async def list_highlights(book_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    res = await db.execute(select(Highlight).where(Highlight.user_id == user.id, Highlight.book_id == book_id).order_by(Highlight.created_at.desc()))
    return list(res.scalars().all())


@router.delete("/highlights/{highlight_id}")
async def delete_highlight(highlight_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    from sqlalchemy import delete
    await db.execute(delete(Highlight).where(Highlight.id == highlight_id, Highlight.user_id == user.id))
    await db.commit()
    return {"message": "Deleted"}
