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

        # Guarantee only 1 review per user per book: update if already exists
        existing = await self.review_repo.get_by_book_and_user(book_id, user_id)
        if existing:
            existing.review_text = review_text
            existing.rating = rating
            existing.updated_by = created_by
            updated = await self.review_repo.update(existing)
            logger.info("Review updated: book=%s user=%s rating=%s", book_id, user_id, rating)
            return updated

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

    async def update_review(
        self,
        book_id: int,
        user_id: int,
        review_text: str,
        rating: int,
        updated_by: str,
        review_id: int | None = None,
    ) -> Review:
        book = await self.book_repo.get_by_id(book_id)
        if not book:
            raise EntityNotFoundError("Book", book_id)

        if review_id:
            review = await self.review_repo.get_by_id(review_id)
            if not review or review.book_id != book_id:
                raise EntityNotFoundError("Review", review_id)
        else:
            review = await self.review_repo.get_by_book_and_user(book_id, user_id)
            if not review:
                raise EntityNotFoundError("Review for user and book", book_id)

        if review.user_id != user_id:
            raise ForbiddenError("You can only edit your own review")

        review.review_text = review_text
        review.rating = rating
        review.updated_by = updated_by
        updated = await self.review_repo.update(review)
        logger.info("Review updated: id=%s book=%s user=%s rating=%s", updated.id, book_id, user_id, rating)
        return updated

    async def delete_review(
        self,
        book_id: int,
        user_id: int,
        review_id: int | None = None,
        is_admin: bool = False,
    ) -> None:
        if review_id:
            review = await self.review_repo.get_by_id(review_id)
            if not review or review.book_id != book_id:
                raise EntityNotFoundError("Review", review_id)
        else:
            review = await self.review_repo.get_by_book_and_user(book_id, user_id)
            if not review:
                raise EntityNotFoundError("Review", book_id)

        if review.user_id != user_id and not is_admin:
            raise ForbiddenError("You can only delete your own review")

        await self.review_repo.delete(review)
        logger.info("Review deleted: id=%s book=%s by user=%s", review.id, book_id, user_id)

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
