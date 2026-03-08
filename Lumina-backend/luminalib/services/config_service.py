"""System configuration service."""

from __future__ import annotations

import logging

from luminalib.models.system_config import SystemConfig
from luminalib.repositories.config_repository import ConfigRepository
from luminalib.schemas.config_schema import SystemConfigUpdate

logger = logging.getLogger("luminalib.services.config")


class ConfigService:
    """Read/update runtime system configuration."""

    def __init__(self, config_repo: ConfigRepository) -> None:
        self.config_repo = config_repo

    async def get_config(self) -> SystemConfig:
        config = await self.config_repo.get_config()
        if not config:
            # Seed a default row
            config = SystemConfig(
                llm_provider="mock",
                storage_provider="local",
                recommendation_engine="content_based",
                created_by="system",
                updated_by="system",
            )
            config = await self.config_repo.create(config)
            logger.info("Default system config seeded")
        return config

    async def update_config(self, payload: SystemConfigUpdate, updated_by: str) -> SystemConfig:
        config = await self.get_config()
        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(config, field, value)
        config.updated_by = updated_by
        config = await self.config_repo.update(config)
        logger.info("System config updated by %s: %s", updated_by, update_data)
        return config
