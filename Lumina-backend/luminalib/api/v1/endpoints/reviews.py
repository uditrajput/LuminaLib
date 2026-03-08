"""Review endpoints — submit reviews with borrow validation."""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, status

from luminalib.api.v1.deps import get_current_user, get_review_service
from luminalib.models.review import Review
from luminalib.models.user import User
from luminalib.schemas.review_schema import ReviewCreate, ReviewRead
from luminalib.services.review_service import ReviewService

router = APIRouter(prefix="/books", tags=["reviews"])


@router.post(
    "/{book_id}/reviews",
    response_model=ReviewRead,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a book review (requires prior borrow)",
)
async def add_review(
    book_id: int,
    payload: ReviewCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    review_svc: ReviewService = Depends(get_review_service),
) -> Review:
    review = await review_svc.add_review(
        book_id=book_id,
        user_id=user.id,
        review_text=payload.review_text,
        rating=payload.rating,
        created_by=user.email,
    )
    background_tasks.add_task(review_svc.update_review_summary, book_id)
    return review
