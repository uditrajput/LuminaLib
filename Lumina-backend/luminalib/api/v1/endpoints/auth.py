"""Auth endpoints — signup, login, profile, logout."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status

from luminalib.api.v1.deps import get_auth_service, get_current_user
from luminalib.models.user import User
from luminalib.schemas.auth_schema import LoginRequest, Token
from luminalib.schemas.user_schema import PasswordChange, UserCreate, UserRead, UserUpdate
from luminalib.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/signup",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def signup(
    payload: UserCreate,
    auth_service: AuthService = Depends(get_auth_service),
) -> User:
    return await auth_service.signup(
        payload.email, payload.password, payload.role, payload.full_name
    )


@router.post("/login", response_model=Token, summary="Authenticate and get JWT token")
async def login(
    payload: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> Token:
    return await auth_service.login(payload.email, payload.password)


@router.get("/profile", response_model=UserRead, summary="Get current user profile")
async def profile(user: User = Depends(get_current_user)) -> User:
    return user


@router.put("/profile", response_model=UserRead, summary="Update current user profile")
async def update_profile(
    payload: UserUpdate,
    user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
) -> User:
    return await auth_service.update_profile(
        user,
        email=payload.email,
        full_name=payload.full_name,
        bio=payload.bio,
        avatar_url=payload.avatar_url,
    )


@router.put(
    "/change-password",
    response_model=UserRead,
    summary="Change current user password",
)
async def change_password(
    payload: PasswordChange,
    user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
) -> User:
    return await auth_service.change_password(
        user, payload.current_password, payload.new_password
    )


@router.post("/logout", summary="Logout (stateless — client discards token)")
async def logout(_: User = Depends(get_current_user)) -> dict[str, str]:
    return {"detail": "Logged out"}

