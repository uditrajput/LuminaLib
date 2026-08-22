"""User schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

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
    profile_completed: bool | None = None
    dob: str | None = None
    profession: str | None = None
    hobbies: list[str] | None = None
    interests: list[str] | None = None
    favorite_topics: list[str] | None = None
    favorite_genres: list[str] | None = None
    reading_preferences: list[str] | None = None
    preferred_language: str | None = None
    education_records: list[dict] | None = None
    contact_info: dict | None = None

    @model_validator(mode="after")
    def validate_age_profession(self) -> UserUpdate:
        if self.dob and self.dob.strip():
            try:
                birth_date = datetime.strptime(self.dob[:10], "%Y-%m-%d")
                current_year = datetime.now().year
                age = current_year - birth_date.year
                profession = self.profession or ""

                min_age = 5
                if profession in ["Working Professional", "Self-Employed", "Self-employed", "Business Owner"]:
                    min_age = 15
                elif profession in ["Student", "Other"]:
                    min_age = 5
                else:
                    min_age = 5

                if age < min_age:
                    label = profession if profession else "User"
                    raise ValueError(f"{label} age cannot be less than {min_age} years")
            except (ValueError, TypeError) as e:
                if "cannot be less than" in str(e):
                    raise e
        if self.contact_info and isinstance(self.contact_info, dict):
            primary = str(self.contact_info.get("primary_mobile") or "").strip()
            secondary = str(self.contact_info.get("secondary_mobile") or "").strip()
            if primary and secondary and primary == secondary:
                raise ValueError("Secondary mobile number cannot be the same as primary mobile number")
        return self


class AdminUserUpdate(BaseModel):
    """Payload for admin updating any user — includes role."""

    email: EmailStr | None = None
    full_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    role: str | None = None
    is_active: bool | None = None
    is_locked: bool | None = None
    profile_completed: bool | None = None
    dob: str | None = None
    profession: str | None = None
    hobbies: list[str] | None = None
    interests: list[str] | None = None
    favorite_topics: list[str] | None = None
    favorite_genres: list[str] | None = None
    reading_preferences: list[str] | None = None
    preferred_language: str | None = None
    education_records: list[dict] | None = None
    contact_info: dict | None = None
    new_password: str | None = Field(default=None, min_length=8)

    @model_validator(mode="after")
    def validate_contact_info(self) -> AdminUserUpdate:
        if self.contact_info and isinstance(self.contact_info, dict):
            primary = str(self.contact_info.get("primary_mobile") or "").strip()
            secondary = str(self.contact_info.get("secondary_mobile") or "").strip()
            if primary and secondary and primary == secondary:
                raise ValueError("Secondary mobile number cannot be the same as primary mobile number")
        return self


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
    is_locked: bool
    full_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    profile_completed: bool = False
    dob: str | None = None
    profession: str | None = None
    hobbies: list[str] | None = None
    interests: list[str] | None = None
    favorite_topics: list[str] | None = None
    favorite_genres: list[str] | None = None
    reading_preferences: list[str] | None = None
    preferred_language: str | None = None
    education_records: list[dict] | None = None
    contact_info: dict | None = None
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


class BorrowedBookInfo(BaseModel):
    book_id: int
    title: str
    author: str | None = None
    cover_image_url: str | None = None
    borrowed_at: datetime
    returned_at: datetime | None = None


class UserDashboardMetrics(BaseModel):
    """Metrics for the user dashboard."""

    total_borrowed: int
    currently_borrowed: int
    returned: int
    active_borrows: list[BorrowedBookInfo] = []
    recent_returns: list[BorrowedBookInfo] = []


