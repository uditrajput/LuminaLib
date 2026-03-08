"""Local filesystem storage implementation."""

from __future__ import annotations

import logging
import os
from pathlib import Path

from luminalib.core.dynamic_config import get_dynamic
from luminalib.interfaces.storage_interface import StorageInterface

logger = logging.getLogger("luminalib.storage.local")


class LocalStorage(StorageInterface):
    """Local storage implementation using the filesystem."""

    def __init__(self, base_path: str | None = None):
        self._base_path = Path(base_path or get_dynamic("storage_path", "./storage"))
        self._base_path.mkdir(parents=True, exist_ok=True)
        logger.info("LocalStorage initialized at: %s", self._base_path.absolute())

    async def upload(self, filename: str, content: bytes) -> str:
        """Store a file locally and return the filename as key."""
        file_path = self._base_path / filename
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(file_path, "wb") as f:
            f.write(content)
            
        logger.info("File uploaded: %s", filename)
        return filename

    async def download(self, key: str) -> bytes:
        """Retrieve local file content."""
        file_path = self._base_path / key
        if not file_path.exists():
            logger.error("File not found: %s", key)
            raise FileNotFoundError(f"File not found: {key}")
            
        with open(file_path, "rb") as f:
            return f.read()

    async def delete(self, key: str) -> None:
        """Remove local file."""
        file_path = self._base_path / key
        if file_path.exists():
            os.remove(file_path)
            logger.info("File deleted: %s", key)
        else:
            logger.warning("Attempted to delete non-existent file: %s", key)
