"""Reading telemetry — pages read, progress, session duration."""

from __future__ import annotations

from datetime import datetime
from sqlalchemy import Integer, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from luminalib.db.base import Base


class ReadingSession(Base):
    __tablename__ = "reading_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    book_id: Mapped[int] = mapped_column(Integer, ForeignKey("books.id", ondelete="CASCADE"), index=True, nullable=False)
    pages_read: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    progress_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
