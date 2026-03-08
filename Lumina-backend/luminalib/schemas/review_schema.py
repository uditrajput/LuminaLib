"""Review schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReviewCreate(BaseModel):
    """Payload for submitting a book review."""

    review_text: str = Field(min_length=5)
    rating: int = Field(ge=1, le=5)


class ReviewRead(BaseModel):
    """Review response schema with audit fields."""

    id: int
    book_id: int
    user_id: int
    review_text: str
    rating: int
    full_name: str | None = None
    created_by: str | None = None
    created_date: datetime
    updated_by: str | None = None
    updated_date: datetime

    model_config = ConfigDict(from_attributes=True)
