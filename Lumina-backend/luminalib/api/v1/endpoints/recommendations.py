"""Recommendation endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.api.v1.deps import (
    get_book_service,
    get_borrow_repo,
    get_current_user,
    get_db,
    require_admin,
)
from luminalib.models.book import Book
from luminalib.models.recommendation import UserPreference
from luminalib.models.user import User
from luminalib.repositories.borrow_repository import BorrowRepository
from luminalib.schemas.book_schema import BookRead
from luminalib.services.book_service import BookService
from luminalib.services.recommendation_service import recommend_books, recommend_similar_books
from luminalib.services.recommender_model_service import recommend_from_model, train_recommender

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("", response_model=list[BookRead], summary="Get ML-based book recommendations")
async def get_recommendations(
    book_id: int | None = None,
    limit: int = 5,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    book_svc: BookService = Depends(get_book_service),
    borrow_repo: BorrowRepository = Depends(get_borrow_repo),
) -> list[Book]:
    all_books = list(await book_svc.get_all_books())
    from luminalib.services.user_group_service import UserGroupService
    group_svc = UserGroupService(session)
    authorized_private_ids = set(await group_svc.get_user_authorized_book_ids(user.id))

    books = [
        b for b in all_books
        if getattr(b, "access_level", "public") != "private" or b.id in authorized_private_ids
    ]

    import time
    t0 = time.perf_counter()

    if book_id:
        target = next((b for b in books if b.id == book_id), None)
        if target:
            model_results = recommend_from_model(target, books, limit=limit)
            results = model_results if model_results else recommend_similar_books(target, books, limit=limit)
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            try:
                from luminalib.core.telemetry import record_recommendation_event
                record_recommendation_event(num_books=len(results), latency_ms=elapsed_ms)
            except Exception:
                pass
            return results

    # Fetch user preferences
    pref_result = await session.execute(
        select(UserPreference).where(UserPreference.user_id == user.id)
    )
    pref = pref_result.scalar_one_or_none()
    
    # Fetch user borrowing history to inform recommendations
    borrowed_books = await borrow_repo.get_user_borrowed_books(user.id)
    
    results = recommend_books(
        books, 
        preferences=pref.preferences if pref else {}, 
        borrowed_books=borrowed_books,
        limit=limit
    )
    elapsed_ms = (time.perf_counter() - t0) * 1000.0
    try:
        from luminalib.core.telemetry import record_recommendation_event
        record_recommendation_event(num_books=len(results), latency_ms=elapsed_ms)
    except Exception:
        pass

    return results


@router.post("/train", summary="Train recommendation model (admin)")
async def train_recommendation_model(
    _: User = Depends(require_admin),
    book_svc: BookService = Depends(get_book_service),
) -> dict[str, str]:
    books = list(await book_svc.get_all_books())
    return train_recommender(books)
