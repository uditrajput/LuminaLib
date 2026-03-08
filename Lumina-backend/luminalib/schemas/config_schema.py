"""System configuration schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SystemConfigRead(BaseModel):
    """System configuration response."""

    id: int
    llm_provider: str
    llm_model: str | None = None
    llm_api_key: str | None = None
    llm_base_url: str | None = None
    storage_provider: str
    recommendation_engine: str
    created_by: str | None = None
    created_date: datetime
    updated_by: str | None = None
    updated_date: datetime

    model_config = ConfigDict(from_attributes=True)


class SystemConfigUpdate(BaseModel):
    """Payload for updating system configuration."""

    llm_provider: str | None = None
    llm_model: str | None = None
    llm_api_key: str | None = None
    llm_base_url: str | None = None
    storage_provider: str | None = None
    recommendation_engine: str | None = None


class AppConfigRead(BaseModel):
    id: int
    key: str
    value: str
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)


class AppConfigCreate(BaseModel):
    key: str
    value: str
    description: str | None = None


class AppConfigUpdate(BaseModel):
    value: str | None = None
    description: str | None = None
