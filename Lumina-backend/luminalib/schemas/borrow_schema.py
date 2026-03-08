"""Borrow schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BorrowRead(BaseModel):
    """Borrow record response."""

    id: int
    book_id: int
    user_id: int
    borrowed_at: datetime
    returned_at: datetime | None = None
    created_by: str | None = None
    created_date: datetime
    updated_by: str | None = None
    updated_date: datetime

    model_config = ConfigDict(from_attributes=True)


class BorrowStatusRead(BaseModel):
    """Current borrow status for a user/book pair."""

    status: str
    borrowed_at: datetime | None = None
    returned_at: datetime | None = None
