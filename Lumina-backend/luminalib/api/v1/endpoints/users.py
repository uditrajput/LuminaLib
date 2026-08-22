"""User management endpoints — admin CRUD + preferences."""

from __future__ import annotations

import math

from fastapi import APIRouter, Depends, HTTPException, Query, status, Request, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.api.v1.deps import get_auth_service, get_current_user, get_db, get_user_repo, require_admin
from luminalib.models.recommendation import UserPreference
from luminalib.models.user import User
from luminalib.repositories.user_repository import UserRepository
from luminalib.schemas.preferences_schema import UserPreferencesRead, UserPreferencesUpdate
from luminalib.schemas.user_schema import (
    AdminUserUpdate,
    PaginatedUserResponse,
    UserCreate,
    UserRead,
    UserStats,
    UserUpdate,
)
from luminalib.services.auth_service import AuthService
from sqlalchemy import select

router = APIRouter(prefix="/users", tags=["users"])


# ── Self (current user) ────────────────────────────────────────────────────────

@router.get("/me", response_model=UserRead, summary="Get current user profile")
async def get_me(user: User = Depends(get_current_user)) -> User:
    """Returns the currently authenticated user's profile."""
    return user


@router.get("/me/dashboard", summary="Get user dashboard metrics")
async def get_dashboard_metrics(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    from luminalib.repositories.borrow_repository import BorrowRepository
    from luminalib.schemas.user_schema import UserDashboardMetrics, BorrowedBookInfo
    borrow_repo = BorrowRepository(session)
    
    stats = await borrow_repo.get_user_borrow_stats(user.id)
    active_borrows_raw = await borrow_repo.get_active_borrows_with_book(user.id)
    recent_returns_raw = await borrow_repo.get_recent_returns_with_book(user.id, limit=10)
    
    active_borrows = [
        BorrowedBookInfo(
            book_id=book.id,
            title=book.title,
            author=book.author,
            cover_image_url=book.cover_image_url,
            borrowed_at=borrow.borrowed_at,
            returned_at=borrow.returned_at,
        )
        for borrow, book in active_borrows_raw
    ]
    
    recent_returns = [
        BorrowedBookInfo(
            book_id=book.id,
            title=book.title,
            author=book.author,
            cover_image_url=book.cover_image_url,
            borrowed_at=borrow.borrowed_at,
            returned_at=borrow.returned_at,
        )
        for borrow, book in recent_returns_raw
    ]
    
    return UserDashboardMetrics(
        total_borrowed=stats["total_borrowed"],
        currently_borrowed=stats["currently_borrowed"],
        returned=stats["returned"],
        active_borrows=active_borrows,
        recent_returns=recent_returns,
    )


@router.put("/me", response_model=UserRead, summary="Update current user profile")
async def update_me(
    payload: UserUpdate,
    user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
) -> User:
    update_data = payload.model_dump(exclude_unset=True)
    return await auth_service.update_profile(
        user,
        **update_data
    )


@router.post("/me/avatar", response_model=UserRead, summary="Upload avatar image")
async def upload_avatar(
    request: Request,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
) -> User:
    import asyncio
    from pathlib import Path
    from uuid import uuid4
    from luminalib.core.dynamic_config import get_dynamic

    storage_path = Path(get_dynamic("storage_path", "./storage")) / "avatars"
    storage_path.mkdir(parents=True, exist_ok=True)
    ext = Path(file.filename or "").suffix or ".jpg"
    avatar_key = f"{uuid4().hex}{ext}"
    avatar_path = storage_path / avatar_key
    file_bytes = await file.read()
    await asyncio.to_thread(avatar_path.write_bytes, file_bytes)

    base_url = str(request.base_url).rstrip("/")
    new_avatar_url = f"{base_url}/avatars/{avatar_key}"

    return await auth_service.update_profile(
        user,
        avatar_url=new_avatar_url
    )

# ── Admin — stats ──────────────────────────────────────────────────────────────

@router.get("/stats", response_model=UserStats, summary="Get user statistics (admin)")
async def get_user_stats(
    user_repo: UserRepository = Depends(get_user_repo),
    _: User = Depends(require_admin),
) -> UserStats:
    stats = await user_repo.get_stats()
    return UserStats(**stats)


@router.get("/pending-approvals", response_model=list[UserRead], summary="List users pending Admin approval")
async def list_pending_approvals(
    session: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """List users who have verified their email and are waiting for Admin approval."""
    stmt = select(User).where(User.status == "verified_pending_approval")
    res = await session.execute(stmt)
    return res.scalars().all()


@router.post("/{user_id}/approve", response_model=UserRead, summary="Approve & enable pending user access")
async def approve_user_access(
    user_id: int,
    admin: User = Depends(require_admin),
    auth_service: AuthService = Depends(get_auth_service),
):
    """Approve a user waiting in pending approval queue."""
    return await auth_service.approve_user(user_id=user_id, admin_email=admin.email)


# ── Admin — paginated list ─────────────────────────────────────────────────────

@router.get("", response_model=PaginatedUserResponse, summary="List users with search & pagination (admin)")
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: str | None = Query(None, description="Search by email or full name"),
    role: str | None = Query(None, description="Filter by role (user|admin)"),
    user_repo: UserRepository = Depends(get_user_repo),
    _: User = Depends(require_admin),
) -> PaginatedUserResponse:
    items, total = await user_repo.search_paginated(page=page, size=size, search=search, role=role)
    pages = max(1, math.ceil(total / size))
    return PaginatedUserResponse(items=items, total=total, page=page, size=size, pages=pages)


# ── Admin — create user ────────────────────────────────────────────────────────

@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED, summary="Create a new user (admin)")
async def admin_create_user(
    payload: UserCreate,
    admin: User = Depends(require_admin),
    auth_service: AuthService = Depends(get_auth_service),
) -> User:
    return await auth_service.admin_create_user(
        admin_email=admin.email,
        email=payload.email,
        password=payload.password,
        role=payload.role,
        full_name=payload.full_name,
        bio=payload.bio,
        is_active=payload.is_active,
    )


# ── Admin — get/update/delete user by ID ──────────────────────────────────────

@router.get("/{user_id}", response_model=UserRead, summary="Get a user by ID (admin)")
async def get_user(
    user_id: int,
    user_repo: UserRepository = Depends(get_user_repo),
    _: User = Depends(require_admin),
) -> User:
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserRead, summary="Update a user by ID (admin)")
async def admin_update_user(
    user_id: int,
    payload: AdminUserUpdate,
    admin: User = Depends(require_admin),
    user_repo: UserRepository = Depends(get_user_repo),
    auth_service: AuthService = Depends(get_auth_service),
) -> User:
    target = await user_repo.get_by_id(user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return await auth_service.admin_update_user(
        target_user=target,
        admin_email=admin.email,
        email=payload.email,
        full_name=payload.full_name,
        bio=payload.bio,
        avatar_url=payload.avatar_url,
        role=payload.role,
        is_active=payload.is_active,
        is_locked=payload.is_locked,
        new_password=payload.new_password,
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a user (admin)")
async def delete_user(
    user_id: int,
    admin: User = Depends(require_admin),
    user_repo: UserRepository = Depends(get_user_repo),
) -> None:
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own admin account.",
        )
    target = await user_repo.get_by_id(user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    await user_repo.delete(target)


# ── Legacy role endpoint (kept for back-compat) ───────────────────────────────

@router.put("/{user_id}/role", response_model=UserRead, summary="Update user role (admin)")
async def update_role(
    user_id: int,
    role: str,
    admin: User = Depends(require_admin),
    user_repo: UserRepository = Depends(get_user_repo),
) -> User:
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    role_obj = await user_repo.get_role_by_name(role)
    if not role_obj:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Role '{role}' not found")
    user.role_id = role_obj.id
    user.updated_by = admin.email
    return await user_repo.update(user)


# ── Preferences ────────────────────────────────────────────────────────────────

@router.get("/me/preferences", response_model=UserPreferencesRead, summary="Get current user preferences")
async def get_preferences(
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserPreference:
    result = await session.execute(
        select(UserPreference).where(UserPreference.user_id == user.id)
    )
    pref = result.scalar_one_or_none()
    if not pref:
        pref = UserPreference(
            user_id=user.id,
            preferences={},
            created_by=user.email,
            updated_by=user.email,
        )
        session.add(pref)
        await session.commit()
        await session.refresh(pref)
    return pref


@router.put("/me/preferences", response_model=UserPreferencesRead, summary="Update current user preferences")
async def update_preferences(
    payload: UserPreferencesUpdate,
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserPreference:
    result = await session.execute(
        select(UserPreference).where(UserPreference.user_id == user.id)
    )
    pref = result.scalar_one_or_none()
    if not pref:
        pref = UserPreference(
            user_id=user.id,
            preferences=payload.preferences,
            created_by=user.email,
            updated_by=user.email,
        )
        session.add(pref)
    else:
        pref.preferences = payload.preferences
        pref.updated_by = user.email
    await session.commit()
    await session.refresh(pref)
    return pref
