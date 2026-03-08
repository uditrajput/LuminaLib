"""System configuration repository."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.models.system_config import SystemConfig
from luminalib.repositories.base_repository import BaseRepository


class ConfigRepository(BaseRepository[SystemConfig]):
    """SystemConfig data access — singleton row pattern."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(SystemConfig, session)

    async def get_config(self) -> SystemConfig | None:
        """Return the single configuration row (id=1)."""
        result = await self.session.execute(select(SystemConfig).limit(1))
        return result.scalar_one_or_none()
