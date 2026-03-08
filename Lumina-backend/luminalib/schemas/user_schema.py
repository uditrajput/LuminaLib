"""User schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

import re


class UserCreate(BaseModel):
    """Payload for user registration."""

    email: EmailStr
    password: str = Field(min_length=12)
    role: str = "user"
    full_name: str | None = None
    bio: str | None = "Student"
    is_active: bool = True

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[^A-Za-z0-9]", v):
            raise ValueError("Password must contain at least one symbol")
        return v


class UserUpdate(BaseModel):
    """Payload for updating user profile (self)."""

    email: EmailStr | None = None
    full_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None


class AdminUserUpdate(BaseModel):
    """Payload for admin updating any user — includes role."""

    email: EmailStr | None = None
    full_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    role: str | None = None
    is_active: bool | None = None
    new_password: str | None = Field(default=None, min_length=8)


class PasswordChange(BaseModel):
    """Payload for changing a user's password."""

    current_password: str
    new_password: str = Field(min_length=8)


class UserRead(BaseModel):
    """User response schema with audit fields."""

    id: int
    email: EmailStr
    role: str
    is_active: bool
    full_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    created_by: str | None = None
    created_date: datetime
    updated_by: str | None = None
    updated_date: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("role", mode="before")
    @classmethod
    def extract_role_name(cls, v):
        if hasattr(v, "name"):
            return v.name
        return v


class PaginatedUserResponse(BaseModel):
    """Paginated user list response."""

    items: list[UserRead]
    total: int
    page: int
    size: int
    pages: int


class UserStats(BaseModel):
    """Aggregate stats for the admin user dashboard."""

    total: int
    admins: int
    regular_users: int
    newest_user_email: str | None = None


