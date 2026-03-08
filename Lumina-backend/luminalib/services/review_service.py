"""Review service."""

from __future__ import annotations

import logging

from luminalib.core.exceptions import EntityNotFoundError, ForbiddenError
from luminalib.interfaces.llm_interface import LLMInterface
from luminalib.models.review import Review
from luminalib.repositories.book_repository import BookRepository
from luminalib.repositories.borrow_repository import BorrowRepository
from luminalib.repositories.review_repository import ReviewRepository

logger = logging.getLogger("luminalib.services.review")


class ReviewService:
    """Business logic for book reviews."""

    def __init__(
        self,
        review_repo: ReviewRepository,
        book_repo: BookRepository,
        borrow_repo: BorrowRepository,
        llm: LLMInterface,
    ) -> None:
        self.review_repo = review_repo
        self.book_repo = book_repo
        self.borrow_repo = borrow_repo
        self.llm = llm

    async def add_review(
        self,
        book_id: int,
        user_id: int,
        review_text: str,
        rating: int,
        created_by: str,
    ) -> Review:
        book = await self.book_repo.get_by_id(book_id)
        if not book:
            raise EntityNotFoundError("Book", book_id)

        borrow = await self.borrow_repo.get_any_borrow(book_id, user_id)
        if not borrow:
            raise ForbiddenError("Borrow the book before reviewing")

        review = Review(
            book_id=book_id,
            user_id=user_id,
            review_text=review_text,
            rating=rating,
            created_by=created_by,
            updated_by=created_by,
        )
        review = await self.review_repo.create(review)
        logger.info("Review added: book=%s user=%s rating=%s", book_id, user_id, rating)
        return review

    async def update_review_summary(self, book_id: int) -> None:
        """Regenerate the rolling review consensus for a book."""
        reviews = await self.review_repo.get_by_book(book_id)
        if not reviews:
            return
        corpus = "\n".join(r.review_text for r in reviews)
        summary = await self.llm.analyze_review(corpus)

        book = await self.book_repo.get_by_id(book_id)
        if book:
            book.review_summary = summary
            book.updated_by = "system"
            await self.book_repo.update(book)
            logger.info("Review summary updated for book id=%s", book_id)

    async def list_reviews(self, book_id: int) -> list[Review]:
        return list(await self.review_repo.get_by_book(book_id))
