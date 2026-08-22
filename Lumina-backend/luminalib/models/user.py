"""User model."""

from __future__ import annotations

from sqlalchemy import JSON, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from luminalib.models.base_audit_model import AuditBase


class User(AuditBase):
    """Represents a library user (admin or regular)."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    email_verified: Mapped[bool] = mapped_column(default=True, nullable=False)
    verification_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_locked: Mapped[bool] = mapped_column(default=False, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    voice_preferences: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
        default=lambda: {
            "voice": "af_bella",
            "speed": 1.0,
            "language": "a",
            "auto_play": True,
            "show_transcript": True,
        },
    )
    profile_completed: Mapped[bool] = mapped_column(default=False, nullable=False)
    dob: Mapped[str | None] = mapped_column(String(50), nullable=True)
    profession: Mapped[str | None] = mapped_column(String(100), nullable=True)
    hobbies: Mapped[list | None] = mapped_column(JSON, nullable=True)
    interests: Mapped[list | None] = mapped_column(JSON, nullable=True)
    favorite_topics: Mapped[list | None] = mapped_column(JSON, nullable=True)
    favorite_genres: Mapped[list | None] = mapped_column(JSON, nullable=True)
    reading_preferences: Mapped[list | None] = mapped_column(JSON, nullable=True)
    preferred_language: Mapped[str | None] = mapped_column(String(50), nullable=True)
    education_records: Mapped[list | None] = mapped_column(JSON, nullable=True)
    contact_info: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    role: Mapped["Role"] = relationship("Role", back_populates="users", lazy="selectin")
    group_memberships = relationship("GroupMember", back_populates="user", cascade="all, delete-orphan")
