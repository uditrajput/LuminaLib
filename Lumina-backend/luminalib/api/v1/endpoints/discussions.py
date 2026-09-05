"""Social reading — per-book threads (lightweight, not E2EE)."""

from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.api.v1.deps import get_db, get_current_user
from luminalib.models.discussion import BookDiscussion
from luminalib.models.user import User

router = APIRouter(prefix="/books", tags=["discussions"])


class DiscussionIn(BaseModel):
    content: str
    rating: int = 5


@router.get("/{book_id}/discussions", summary="List discussions")
async def list_discussions(
    book_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    res = await db.execute(
        select(BookDiscussion)
        .where(BookDiscussion.book_id == book_id)
        .order_by(BookDiscussion.created_date.desc())
        .limit(50)
    )
    rows = res.scalars().all()
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "user_name": r.user_name,
            "content": r.content,
            "created_at": r.created_date,
        }
        for r in rows
    ]


@router.post("/{book_id}/discussions", summary="Post discussion")
async def post_discussion(
    book_id: int,
    req: DiscussionIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Content required")
    disc = BookDiscussion(
        book_id=book_id,
        user_id=user.id,
        content=req.content.strip(),
        created_by=user.email,
        updated_by=user.email,
    )
    db.add(disc)
    await db.commit()
    await db.refresh(disc)
    return {
        "id": disc.id,
        "user_id": disc.user_id,
        "user_name": disc.user_name,
        "content": disc.content,
        "created_at": disc.created_date,
        "message": "Posted",
    }


# Follow stub
@router.post("/users/{user_id}/follow", summary="Follow user (stub)")
async def follow_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return {"message": f"Followed user {user_id} (stub — social graph V2)"}

