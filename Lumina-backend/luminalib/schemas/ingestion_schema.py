"""Ingestion job schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class IngestionJobRead(BaseModel):
    """Ingestion job status response."""

    id: int
    document_id: int
    status: str
    error: str | None = None
    created_by: str | None = None
    created_date: datetime
    updated_by: str | None = None
    updated_date: datetime

    model_config = ConfigDict(from_attributes=True)
