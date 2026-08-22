"""Borrow repository."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.models.borrow import BookBorrow
from luminalib.repositories.base_repository import BaseRepository


class BorrowRepository(BaseRepository[BookBorrow]):
    """Borrow-specific data access."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(BookBorrow, session)

    async def get_active_borrow(self, book_id: int, user_id: int) -> BookBorrow | None:
        result = await self.session.execute(
            select(BookBorrow).where(
                BookBorrow.book_id == book_id,
                BookBorrow.user_id == user_id,
                BookBorrow.returned_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def get_any_borrow(self, book_id: int, user_id: int) -> BookBorrow | None:
        result = await self.session.execute(
            select(BookBorrow).where(
                BookBorrow.book_id == book_id,
                BookBorrow.user_id == user_id,
            )
        )
        return result.scalars().first()

    async def get_latest_borrow(self, book_id: int, user_id: int) -> BookBorrow | None:
        result = await self.session.execute(
            select(BookBorrow)
            .where(BookBorrow.book_id == book_id, BookBorrow.user_id == user_id)
            .order_by(BookBorrow.id.desc())
        )
        return result.scalars().first()

    async def get_user_borrowed_books(self, user_id: int) -> list[Book]:
        from luminalib.models.book import Book

        # Fetch only unique books the user has borrowed
        result = await self.session.execute(
            select(Book)
            .join(BookBorrow)
            .where(BookBorrow.user_id == user_id)
            .distinct()
        )
        return list(result.scalars().all())

    async def get_user_borrow_stats(self, user_id: int) -> dict:
        result = await self.session.execute(
            select(BookBorrow).where(BookBorrow.user_id == user_id)
        )
        borrows = result.scalars().all()
        total_borrowed = len(borrows)
        currently_borrowed = sum(1 for b in borrows if b.returned_at is None)
        returned = total_borrowed - currently_borrowed
        return {
            "total_borrowed": total_borrowed,
            "currently_borrowed": currently_borrowed,
            "returned": returned,
        }

    async def get_active_borrows_with_book(self, user_id: int) -> list[tuple[BookBorrow, Book]]:
        from luminalib.models.book import Book
        result = await self.session.execute(
            select(BookBorrow, Book)
            .join(Book, BookBorrow.book_id == Book.id)
            .where(BookBorrow.user_id == user_id, BookBorrow.returned_at.is_(None))
            .order_by(BookBorrow.borrowed_at.desc())
        )
        return list(result.all())

    async def get_recent_returns_with_book(self, user_id: int, limit: int = 5) -> list[tuple[BookBorrow, Book]]:
        from luminalib.models.book import Book
        result = await self.session.execute(
            select(BookBorrow, Book)
            .join(Book, BookBorrow.book_id == Book.id)
            .where(BookBorrow.user_id == user_id, BookBorrow.returned_at.isnot(None))
            .order_by(BookBorrow.returned_at.desc())
            .limit(limit)
        )
        return list(result.all())
