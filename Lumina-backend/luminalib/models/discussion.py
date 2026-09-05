"""BookDiscussion model."""

from __future__ import annotations

from typing import TYPE_CHECKING
from sqlalchemy import ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from luminalib.models.base_audit_model import AuditBase

if TYPE_CHECKING:
    from luminalib.models.user import User
    from luminalib.models.book import Book


class BookDiscussion(AuditBase):
    """A discussion post on a book (isolated from reviews)."""

    __tablename__ = "book_discussions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    book_id: Mapped[int] = mapped_column(
        ForeignKey("books.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)

    user: Mapped["User"] = relationship("User", lazy="selectin")
    book: Mapped["Book"] = relationship("Book", lazy="selectin")

    @property
    def user_name(self) -> str:
        if self.user and self.user.full_name:
            return self.user.full_name
        if self.user and self.user.email:
            return self.user.email.split("@")[0]
        return "Anonymous"
