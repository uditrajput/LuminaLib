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
        existing = await self.user_repo.get_by_email(email)
        if existing:
            raise DuplicateEntityError("Email already registered")

        role_obj = await self.user_repo.get_role_by_name(role)
        if not role_obj:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Role {role} not found")

        user = User(
            email=email,
            hashed_password=hash_password(password),
            role_id=role_obj.id,
            full_name=full_name,
            bio="Student",
            created_by=email,
            updated_by=email,
        )
        user = await self.user_repo.create(user)
        logger.info("User registered: %s", email)
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
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Role {role} not found")

        user = User(
            email=email,
            hashed_password=hash_password(password),
            role_id=role_obj.id,
            full_name=full_name,
            bio=bio,
            is_active=is_active,
            created_by=admin_email,
            updated_by=admin_email,
        )
        user = await self.user_repo.create(user)
        logger.info("Admin %s created user: %s", admin_email, email)
        return user

    async def login(self, email: str, password: str) -> Token:
        user = await self.user_repo.get_by_email(email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not registered"
            )

        if not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="This account has been deactivated"
            )

        token = create_access_token(user.email)
        logger.info("User logged in: %s", email)
        return Token(access_token=token)

    async def update_profile(
        self,
        user: User,
        email: str | None = None,
        full_name: str | None = None,
        bio: str | None = None,
        avatar_url: str | None = None,
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
            user.avatar_url = avatar_url
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


