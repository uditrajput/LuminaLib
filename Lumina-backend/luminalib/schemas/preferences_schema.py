"""User preferences schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserPreferencesUpdate(BaseModel):
    """Payload for updating user preferences."""

    preferences: dict


class UserPreferencesRead(BaseModel):
    """User preferences response with audit fields."""

    id: int
    user_id: int
    preferences: dict
    created_by: str | None = None
    created_date: datetime
    updated_by: str | None = None
    updated_date: datetime

    model_config = ConfigDict(from_attributes=True)
