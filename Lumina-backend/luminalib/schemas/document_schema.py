"""Document schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentCreate(BaseModel):
    """Payload for creating a document."""

    filename: str
    content: str


class DocumentRead(BaseModel):
    """Document response with audit fields."""

    id: int
    filename: str
    content: str
    owner_id: int
    created_by: str | None = None
    created_date: datetime
    updated_by: str | None = None
    updated_date: datetime

    model_config = ConfigDict(from_attributes=True)
