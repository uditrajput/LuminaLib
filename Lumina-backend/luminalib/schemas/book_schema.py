"""Book schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BookCreate(BaseModel):
    """Payload for book creation (metadata only; file uploaded separately)."""

    title: str
    author: str
    genre: str
    year_published: int = Field(ge=1400, le=2100, description="4-digit year published (min 1400)")
    description: str | None = None
    cover_image_url: str | None = None


class BookUpdate(BaseModel):
    """Payload for updating book metadata."""

    title: str | None = None
    author: str | None = None
    genre: str | None = None
    year_published: int | None = Field(default=None, ge=1400, le=2100, description="4-digit year published (min 1400)")
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
    access_level: str = "public"
    created_by_user_id: int | None = None
    group_ids: list[int] = Field(default_factory=list)
    summary: str | None = None
    review_summary: str | None = None
    created_by: str | None = None
    created_date: datetime
    updated_by: str | None = None
    updated_date: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("title", "author", "description", mode="before")
    @classmethod
    def normalize_devanagari_fields(cls, v: str | None) -> str | None:
        if v and isinstance(v, str):
            from luminalib.services.devanagari_converter import clean_and_normalize_devanagari
            return clean_and_normalize_devanagari(v)
        return v

    @field_validator("group_ids", mode="before")
    @classmethod
    def extract_group_ids(cls, v, info):
        if v is None:
            return []
        if isinstance(v, list) and v and hasattr(v[0], "group_id"):
            return [e.group_id for e in v]
        return v or []



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
