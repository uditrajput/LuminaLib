"""Storage abstraction interface."""

from __future__ import annotations

from typing import Protocol


class StorageInterface(Protocol):
    """Protocol defining the storage contract."""

    async def upload(self, filename: str, content: bytes) -> str:
        """Store a file and return a unique key."""
        ...

    async def download(self, key: str) -> bytes:
        """Retrieve file content by key."""
        ...

    async def delete(self, key: str) -> None:
        """Remove a file by key."""
        ...
