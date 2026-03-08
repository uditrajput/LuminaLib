"""App config service."""

from __future__ import annotations

import logging

from fastapi import HTTPException, status

from luminalib.core.dynamic_config import refresh_cache
from luminalib.core.exceptions import DuplicateEntityError
from luminalib.models.app_config import AppConfig
from luminalib.repositories.app_config_repository import AppConfigRepository
from luminalib.schemas.config_schema import AppConfigCreate, AppConfigUpdate

logger = logging.getLogger("luminalib.services.app_config")

class AppConfigService:
    """Manages dynamic KV application settings."""

    def __init__(self, repo: AppConfigRepository) -> None:
        self.repo = repo

    async def get_all(self) -> list[AppConfig]:
        return await self.repo.get_all()

    async def get_by_key(self, key: str) -> AppConfig:
        cfg = await self.repo.get_by_key(key)
        if not cfg:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Config {key} not found")
        return cfg

    async def create(self, payload: AppConfigCreate, created_by: str) -> AppConfig:
        existing = await self.repo.get_by_key(payload.key)
        if existing:
            raise DuplicateEntityError(f"Config '{payload.key}' already exists")

        cfg = AppConfig(
            key=payload.key,
            value=payload.value,
            description=payload.description,
            created_by=created_by,
            updated_by=created_by,
        )
        saved = await self.repo.create(cfg)
        await self._refresh_cache()
        logger.info("AppConfig created: %s by %s", saved.key, created_by)
        return saved

    async def update(self, key: str, payload: AppConfigUpdate, updated_by: str) -> AppConfig:
        cfg = await self.get_by_key(key)
        
        if payload.value is not None:
            cfg.value = payload.value
        if payload.description is not None:
            cfg.description = payload.description
            
        cfg.updated_by = updated_by
        saved = await self.repo.update(cfg)
        await self._refresh_cache()
        logger.info("AppConfig updated: %s by %s", saved.key, updated_by)
        return saved

    async def _refresh_cache(self) -> None:
        """Reload the in-memory dynamic config cache from the DB."""
        all_configs = await self.repo.get_all()
        rows = {c.key: c.value for c in all_configs}
        refresh_cache(rows)
