"""App specific key-value config repository."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.models.app_config import AppConfig
from luminalib.repositories.base_repository import BaseRepository


class AppConfigRepository(BaseRepository[AppConfig]):
    """AppConfig data access."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(AppConfig, session)

    async def get_by_key(self, key: str) -> AppConfig | None:
        result = await self.session.execute(select(AppConfig).where(AppConfig.key == key))
        return result.scalar_one_or_none()

    async def get_all(self) -> list[AppConfig]:
        result = await self.session.execute(select(AppConfig))
        return list(result.scalars().all())
