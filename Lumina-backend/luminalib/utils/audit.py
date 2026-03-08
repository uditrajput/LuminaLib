"""Audit utilities for populating audit columns."""

from __future__ import annotations

from luminalib.db.base import Base


def set_audit_created(entity: Base, user_email: str) -> None:
    """Set created_by and updated_by on a new entity."""
    entity.created_by = user_email  # type: ignore[attr-defined]
    entity.updated_by = user_email  # type: ignore[attr-defined]


def set_audit_updated(entity: Base, user_email: str) -> None:
    """Set updated_by on an existing entity."""
    entity.updated_by = user_email  # type: ignore[attr-defined]
