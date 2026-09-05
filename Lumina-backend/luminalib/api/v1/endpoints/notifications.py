"""Notifications — minimal."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.api.v1.deps import get_db, get_current_user
from luminalib.models.notification import Notification
from luminalib.models.user import User

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    res = await db.execute(select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(50))
    return list(res.scalars().all())


@router.post("/{notif_id}/read")
async def mark_read(notif_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await db.execute(update(Notification).where(Notification.id == notif_id, Notification.user_id == user.id).values(read=True))
    await db.commit()
    return {"message": "Read"}

@router.post("/read-all")
async def mark_all(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await db.execute(update(Notification).where(Notification.user_id == user.id).values(read=True))
    await db.commit()
    return {"message": "All read"}
