"""App keys configuration endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status

from luminalib.api.v1.deps import get_app_config_service, get_current_user, require_admin
from luminalib.models.user import User
from luminalib.schemas.config_schema import AppConfigCreate, AppConfigRead, AppConfigUpdate
from luminalib.services.app_config_service import AppConfigService

router = APIRouter(prefix="/app-config", tags=["config"])


@router.get(
    "",
    response_model=list[AppConfigRead],
    summary="Get all app configs",
)
async def list_app_configs(
    _: User = Depends(require_admin),
    service: AppConfigService = Depends(get_app_config_service),
):
    return await service.get_all()


@router.get(
    "/{key}",
    response_model=AppConfigRead,
    summary="Get app config by key",
)
async def get_app_config_by_key(
    key: str,
    _: User = Depends(get_current_user),
    service: AppConfigService = Depends(get_app_config_service),
):
    return await service.get_by_key(key)


@router.post(
    "",
    response_model=AppConfigRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create dynamic configuration",
)
async def create_app_config(
    payload: AppConfigCreate,
    admin: User = Depends(require_admin),
    service: AppConfigService = Depends(get_app_config_service),
):
    return await service.create(payload, created_by=admin.email)


@router.put(
    "/{key}",
    response_model=AppConfigRead,
    summary="Update dynamic configuration",
)
async def update_app_config(
    key: str,
    payload: AppConfigUpdate,
    admin: User = Depends(require_admin),
    service: AppConfigService = Depends(get_app_config_service),
):
    return await service.update(key, payload, updated_by=admin.email)
