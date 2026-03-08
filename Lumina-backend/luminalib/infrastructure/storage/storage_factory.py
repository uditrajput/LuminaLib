"""Storage factory — resolves the active StorageInterface implementation."""

from __future__ import annotations

import logging

from luminalib.core.dynamic_config import get_dynamic
from luminalib.infrastructure.storage.local_storage import LocalStorage
from luminalib.infrastructure.storage.s3_storage import S3Storage
from luminalib.interfaces.storage_interface import StorageInterface

logger = logging.getLogger("luminalib.storage.factory")


async def get_storage_provider(provider_override: str | None = None) -> StorageInterface:
    """Return the correct storage implementation based on config or overrides."""
    provider = provider_override or get_dynamic("storage_provider", "local")

    if provider == "s3":
        logger.info("Using S3 storage provider")
        return S3Storage()

    logger.info("Using local filesystem storage provider")
    return LocalStorage()
