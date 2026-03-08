"""Review repository."""

from __future__ import annotations

from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.models.review import Review
from luminalib.repositories.base_repository import BaseRepository


class ReviewRepository(BaseRepository[Review]):
    """Review-specific data access."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Review, session)

    async def get_by_book(self, book_id: int) -> Sequence[Review]:
        result = await self.session.execute(
            select(Review).where(Review.book_id == book_id)
        )
        return result.scalars().all()
