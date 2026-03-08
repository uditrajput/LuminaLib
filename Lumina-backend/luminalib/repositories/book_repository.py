"""Book repository."""

from __future__ import annotations

from typing import Sequence

from sqlalchemy import desc, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.models.book import Book
from luminalib.repositories.base_repository import BaseRepository


class BookRepository(BaseRepository[Book]):
    """Book-specific data access."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Book, session)

    async def get_paginated_books(
        self, page: int = 1, size: int = 10, search: str | None = None
    ) -> tuple[Sequence[Book], int]:
        filters = []
        if search:
            search_pattern = f"%{search}%"
            filters.append(
                (Book.title.ilike(search_pattern))
                | (Book.author.ilike(search_pattern))
                | (Book.genre.ilike(search_pattern))
            )

        # Count total
        count_query = select(func.count(Book.id))
        if filters:
            count_query = count_query.where(*filters)
        count_result = await self.session.execute(count_query)
        total = count_result.scalar_one()

        # Get items
        query = select(Book)
        if filters:
            query = query.where(*filters)
        query = query.order_by(desc(Book.created_date)).offset((page - 1) * size).limit(size)
        
        result = await self.session.execute(query)
        return result.scalars().all(), total
