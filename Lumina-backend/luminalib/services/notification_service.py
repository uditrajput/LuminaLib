"""Notification service for broadcasting in-app notifications."""

from __future__ import annotations

import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.models.notification import Notification
from luminalib.models.user import User

logger = logging.getLogger("luminalib.services.notification")


async def notify_new_public_book(db: AsyncSession, book_id: int, title: str, author: str, genre: str) -> int:
    """Broadcast notification to all active users when a new public book is uploaded."""
    try:
        users_res = await db.execute(select(User.id).where(User.is_active == True))
        user_ids = users_res.scalars().all()
        if not user_ids:
            return 0

        notifications = [
            Notification(
                user_id=uid,
                type="new_book",
                title=f"New Book Added: {title}",
                body=f"'{title}' by {author} ({genre}) is now available in the public library catalog.",
                link=f"/books/{book_id}",
                read=False,
            )
            for uid in user_ids
        ]
        db.add_all(notifications)
        await db.commit()
        logger.info("Sent new book notification for book %s to %s users", book_id, len(notifications))
        return len(notifications)
    except Exception as e:
        logger.warning("Failed to broadcast new book notification for book %s: %s", book_id, e)
        return 0
