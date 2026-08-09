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

    role: Mapped["Role"] = relationship("Role", back_populates="users", lazy="selectin")
