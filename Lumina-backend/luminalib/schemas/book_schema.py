"""Book schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BookCreate(BaseModel):
    """Payload for book creation (metadata only; file uploaded separately)."""

    title: str
    author: str
    genre: str
    year_published: int = Field(ge=0, le=3000)
    description: str | None = None
    cover_image_url: str | None = None


class BookUpdate(BaseModel):
    """Payload for updating book metadata."""

    title: str | None = None
    author: str | None = None
    genre: str | None = None
    year_published: int | None = Field(default=None, ge=0, le=3000)
    description: str | None = None
    cover_image_url: str | None = None


class BookRead(BaseModel):
    """Book response schema with audit fields."""

    id: int
    title: str
    author: str
    genre: str
    year_published: int
    description: str | None = None
    file_name: str | None = None
    content_type: str | None = None
    file_size: int | None = None
    cover_image_url: str | None = None
    summary: str | None = None
    review_summary: str | None = None
    created_by: str | None = None
    created_date: datetime
    updated_by: str | None = None
    updated_date: datetime

    model_config = ConfigDict(from_attributes=True)


class BookSummaryRead(BaseModel):
    """AI-generated book summary with review statistics."""

    book_id: int
    summary: str | None = None
    review_summary: str | None = None
    average_rating: float
    total_reviews: int


class BookListResponse(BaseModel):
    """Paginated book list response."""

    items: list[BookRead]
    page: int
    size: int
    total: int
