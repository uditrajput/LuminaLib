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
    summary="Submit or update a book review (requires prior borrow)",
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


@router.put(
    "/{book_id}/reviews",
    response_model=ReviewRead,
    summary="Edit own book review",
)
async def edit_review_direct(
    book_id: int,
    payload: ReviewCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    review_svc: ReviewService = Depends(get_review_service),
) -> Review:
    review = await review_svc.update_review(
        book_id=book_id,
        user_id=user.id,
        review_text=payload.review_text,
        rating=payload.rating,
        updated_by=user.email,
    )
    background_tasks.add_task(review_svc.update_review_summary, book_id)
    return review


@router.put(
    "/{book_id}/reviews/{review_id}",
    response_model=ReviewRead,
    summary="Edit book review by id",
)
async def edit_review(
    book_id: int,
    review_id: int,
    payload: ReviewCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    review_svc: ReviewService = Depends(get_review_service),
) -> Review:
    review = await review_svc.update_review(
        book_id=book_id,
        review_id=review_id,
        user_id=user.id,
        review_text=payload.review_text,
        rating=payload.rating,
        updated_by=user.email,
    )
    background_tasks.add_task(review_svc.update_review_summary, book_id)
    return review


@router.delete(
    "/{book_id}/reviews",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete own book review",
)
async def delete_review_direct(
    book_id: int,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    review_svc: ReviewService = Depends(get_review_service),
) -> None:
    await review_svc.delete_review(
        book_id=book_id,
        user_id=user.id,
        is_admin=getattr(getattr(user, "role", None), "name", "") == "admin",
    )
    background_tasks.add_task(review_svc.update_review_summary, book_id)


@router.delete(
    "/{book_id}/reviews/{review_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete book review by id",
)
async def delete_review_by_id(
    book_id: int,
    review_id: int,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    review_svc: ReviewService = Depends(get_review_service),
) -> None:
    await review_svc.delete_review(
        book_id=book_id,
        review_id=review_id,
        user_id=user.id,
        is_admin=getattr(getattr(user, "role", None), "name", "") == "admin",
    )
    background_tasks.add_task(review_svc.update_review_summary, book_id)


