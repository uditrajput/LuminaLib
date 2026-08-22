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


@router.get("/verify-email", summary="Verify email address via double opt-in token")
async def verify_email(
    token: str,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Process email verification token and update user status to pending approval."""
    user = await auth_service.verify_email_token(token)
    return {"message": "Email verified successfully. Your account is now pending Admin approval.", "status": user.status}


@router.post("/login", response_model=Token, summary="Authenticate and get JWT token")
async def login(
    payload: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> Token:
    return await auth_service.login(payload.email, payload.password)


@router.get("/social-status", summary="Get status of social OAuth providers")
async def get_social_auth_status() -> dict[str, bool]:
    from luminalib.core.dynamic_config import get_dynamic
    return {
        "google": get_dynamic("google_oauth_enabled", "false").lower() == "true",
        "microsoft": get_dynamic("microsoft_oauth_enabled", "false").lower() == "true",
        "facebook": get_dynamic("facebook_oauth_enabled", "false").lower() == "true",
    }


@router.post("/oauth/{provider}", response_model=Token, summary="Authenticate via Social OAuth 2.0 provider")
async def social_oauth_login(
    provider: str,
    payload: dict,
    auth_service: AuthService = Depends(get_auth_service),
) -> Token:
    """Authenticate or register user via Google, Microsoft, or Facebook OAuth 2.0."""
    from fastapi import HTTPException
    from luminalib.core.dynamic_config import get_dynamic
    
    provider_key = f"{provider.lower()}_oauth_enabled"
    if get_dynamic(provider_key, "false").lower() != "true":
        raise HTTPException(status_code=400, detail=f"{provider.capitalize()} login is currently disabled by administrator.")

    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Missing email in OAuth token payload.")
    
    existing = await auth_service.user_repo.get_by_email(email)
    if not existing:
        # Register new social user
        existing = await auth_service.signup(
            email=email,
            password=f"SocialOAuth2_{provider}_SecureRandomPass!",
            role="user",
            full_name=payload.get("name", email.split("@")[0]),
        )
    
    token = await auth_service.login(email, f"SocialOAuth2_{provider}_SecureRandomPass!")
    return token


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

