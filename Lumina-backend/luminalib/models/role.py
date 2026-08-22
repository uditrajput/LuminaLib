"""SQLAlchemy models for Role-Based Access Control (RBAC)."""

from __future__ import annotations

from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Integer, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from luminalib.models.base_audit_model import AuditBase


class Role(AuditBase):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    permissions_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    users = relationship("User", back_populates="role")
