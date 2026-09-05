"""Authentication service."""

from __future__ import annotations

import logging

from fastapi import HTTPException, status

from luminalib.core.exceptions import DuplicateEntityError
from luminalib.core.security import create_access_token, hash_password, verify_password
from luminalib.models.user import User
from luminalib.repositories.user_repository import UserRepository
from luminalib.schemas.auth_schema import Token

logger = logging.getLogger("luminalib.services.auth")


class AuthService:
    """Handles signup, login, and profile operations."""

    def __init__(self, user_repo: UserRepository) -> None:
        self.user_repo = user_repo

    async def signup(self, email: str, password: str, role: str = "user", full_name: str | None = None) -> User:
        import secrets
        from luminalib.services.email_service import get_smtp_configs, validate_email_domain, send_verification_email

        # Seed default system roles if missing
        await self.user_repo.seed_default_roles()

        existing = await self.user_repo.get_by_email(email)
        if existing:
            raise DuplicateEntityError("Email already registered")

        smtp_cfg = await get_smtp_configs(self.user_repo.session)
        if not validate_email_domain(email, smtp_cfg["allowed_domains"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your email domain is not authorized to register with us.",
            )

        role_obj = await self.user_repo.get_role_by_name(role)
        if not role_obj:
            role_obj = await self.user_repo.get_role_by_name("user")

        verification_token = secrets.token_urlsafe(48)
        initial_status = "unverified" if smtp_cfg["enabled"] else "active"

        user = User(
            email=email,
            hashed_password=hash_password(password),
            role_id=role_obj.id,
            full_name=full_name,
            bio="Student",
            status=initial_status,
            email_verified=not smtp_cfg["enabled"],
            verification_token=verification_token,
            created_by=email,
            updated_by=email,
        )
        user = await self.user_repo.create(user)
        logger.info("User registered (%s): %s", initial_status, email)

        if smtp_cfg["enabled"]:
            await send_verification_email(self.user_repo.session, email, verification_token)

        return user

    async def admin_create_user(
        self,
        admin_email: str,
        email: str,
        password: str,
        role: str = "user",
        full_name: str | None = None,
        bio: str | None = "Student",
        is_active: bool = True,
    ) -> User:
        """Admin creates a user with any role."""
        existing = await self.user_repo.get_by_email(email)
        if existing:
            raise DuplicateEntityError("Email already registered")
        
        role_obj = await self.user_repo.get_role_by_name(role)
        if not role_obj:
            role_obj = await self.user_repo.get_role_by_name("user")

        user = User(
            email=email,
            hashed_password=hash_password(password),
            role_id=role_obj.id,
            full_name=full_name,
            bio=bio,
            is_active=is_active,
            status="active",
            email_verified=True,
            created_by=admin_email,
            updated_by=admin_email,
        )
        user = await self.user_repo.create(user)
        logger.info("Admin %s created user: %s", admin_email, email)
        return user

    async def verify_email_token(self, token: str) -> User:
        """Process double opt-in email verification token."""
        user = await self.user_repo.get_by_verification_token(token)
        if not user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification token.")
        
        user.email_verified = True
        user.status = "verified_pending_approval"
        user.verification_token = None
        return await self.user_repo.update(user)

    async def approve_user(self, user_id: int, admin_email: str) -> User:
        """Admin approves a verified user account."""
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        user.status = "active"
        user.is_active = True
        user.updated_by = admin_email
        return await self.user_repo.update(user)

    async def login(self, email: str, password: str) -> Token:
        user = await self.user_repo.get_by_email(email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not registered"
            )

        if user.is_locked:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Your account is locked due to too many failed login attempts. Please contact an administrator."
            )

        if not verify_password(password, user.hashed_password):
            from luminalib.core.dynamic_config import get_dynamic_int
            user.failed_login_attempts += 1
            max_attempts = get_dynamic_int("max_failed_logins", 5)
            if user.failed_login_attempts >= max_attempts:
                user.is_locked = True
                await self.user_repo.update(user)
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, detail="Your account is locked due to too many failed login attempts. Please contact an administrator."
                )
            await self.user_repo.update(user)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password"
            )

        if user.failed_login_attempts > 0:
            user.failed_login_attempts = 0
            await self.user_repo.update(user)

        from luminalib.services.email_service import get_smtp_configs
        smtp_cfg = await get_smtp_configs(self.user_repo.session)

        if smtp_cfg.get("enabled", False):
            if user.status == "unverified":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Please verify your email address before logging in.",
                )
            if user.status == "verified_pending_approval":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your email is verified. Your account is currently under Admin review for access approval.",
                )
        else:
            if user.status in ("unverified", "verified_pending_approval"):
                user.status = "active"
                user.email_verified = True
                await self.user_repo.update(user)
        if not user.is_active or user.status == "blocked":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="This account has been deactivated"
            )

        token = create_access_token(user.email)
        try:
            from luminalib.core.presence import record_user_activity
            record_user_activity(
                user_id=user.id,
                email=user.email,
                full_name=user.full_name,
            )
        except Exception:
            pass
        logger.info("User logged in: %s", email)
        return Token(access_token=token)

    async def update_profile(
        self,
        user: User,
        email: str | None = None,
        full_name: str | None = None,
        bio: str | None = None,
        avatar_url: str | None = None,
        **kwargs,
    ) -> User:
        if email and email != user.email:
            existing = await self.user_repo.get_by_email(email)
            if existing:
                raise DuplicateEntityError("Email already registered")
            user.email = email
        if full_name is not None:
            user.full_name = full_name
        if bio is not None:
            user.bio = bio
        if avatar_url is not None:
            if avatar_url != "" or not (full_name or bio or email):
                user.avatar_url = avatar_url
            
        for k, v in kwargs.items():
            if v is not None and hasattr(user, k):
                setattr(user, k, v)
                
        user.updated_by = user.email
        return await self.user_repo.update(user)

    async def admin_update_user(
        self,
        target_user: User,
        admin_email: str,
        email: str | None = None,
        full_name: str | None = None,
        bio: str | None = None,
        avatar_url: str | None = None,
        role: str | None = None,
        is_active: bool | None = None,
        is_locked: bool | None = None,
        new_password: str | None = None,
    ) -> User:
        """Admin updates any user — can change role and reset password."""
        if email and email != target_user.email:
            existing = await self.user_repo.get_by_email(email)
            if existing:
                raise DuplicateEntityError("Email already registered")
            target_user.email = email
        if full_name is not None:
            target_user.full_name = full_name
        if bio is not None:
            target_user.bio = bio
        if avatar_url is not None:
            target_user.avatar_url = avatar_url
        if role is not None:
            role_obj = await self.user_repo.get_role_by_name(role)
            if not role_obj:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Role {role} not found")
            target_user.role_id = role_obj.id
        if is_active is not None:
            target_user.is_active = is_active
        if is_locked is not None:
            target_user.is_locked = is_locked
            if not is_locked:
                target_user.failed_login_attempts = 0
        if new_password is not None:
            target_user.hashed_password = hash_password(new_password)
        target_user.updated_by = admin_email
        return await self.user_repo.update(target_user)

    async def change_password(
        self,
        user: User,
        current_password: str,
        new_password: str,
    ) -> User:
        if not verify_password(current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect",
            )
        user.hashed_password = hash_password(new_password)
        user.updated_by = user.email
        return await self.user_repo.update(user)


