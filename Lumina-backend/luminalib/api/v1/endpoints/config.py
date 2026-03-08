"""System configuration endpoint — GET/PUT for runtime provider switching."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from luminalib.api.v1.deps import get_config_service, get_current_user, require_admin
from luminalib.models.system_config import SystemConfig
from luminalib.models.user import User
from luminalib.schemas.config_schema import SystemConfigRead, SystemConfigUpdate
from luminalib.services.config_service import ConfigService

router = APIRouter(prefix="/config", tags=["config"])


@router.get(
    "",
    response_model=SystemConfigRead,
    summary="Get current system configuration",
)
async def get_configuration(
    _: User = Depends(get_current_user),
    config_svc: ConfigService = Depends(get_config_service),
) -> SystemConfig:
    return await config_svc.get_config()


@router.put(
    "",
    response_model=SystemConfigRead,
    summary="Update system configuration (admin)",
    description=(
        "Allows dynamic switching of LLM provider, model, API key, storage provider, "
        "and recommendation engine without restarting the application."
    ),
)
async def update_configuration(
    payload: SystemConfigUpdate,
    admin: User = Depends(require_admin),
    config_svc: ConfigService = Depends(get_config_service),
) -> SystemConfig:
    return await config_svc.update_config(payload, updated_by=admin.email)
