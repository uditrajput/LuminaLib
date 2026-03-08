"""Base audit model — all domain models inherit from this.

Provides: created_by, created_date, updated_by, updated_date.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from luminalib.db.base import Base


class AuditBase(Base):
    """Abstract base with audit columns for every table."""

    __abstract__ = True

    created_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    updated_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
