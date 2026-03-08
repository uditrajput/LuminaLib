"""System Configuration model for dynamic provider switching."""

from __future__ import annotations

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from luminalib.models.base_audit_model import AuditBase


class SystemConfig(AuditBase):
    """Stores runtime infrastructure configuration (LLM, storage, etc.)."""

    __tablename__ = "system_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    llm_provider: Mapped[str] = mapped_column(String(100), default="mock", nullable=False)
    llm_model: Mapped[str | None] = mapped_column(String(255), nullable=True)
    llm_api_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    llm_base_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    storage_provider: Mapped[str] = mapped_column(String(100), default="local", nullable=False)
    recommendation_engine: Mapped[str] = mapped_column(
        String(100), default="content_based", nullable=False
    )
