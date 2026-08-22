"""Role-Based Access Control (RBAC) API endpoints."""

from __future__ import annotations

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.api.v1.deps import get_db, get_current_user
from luminalib.core.rbac import PERMISSIONS, require_permission
from luminalib.models.role import Role
from luminalib.models.user import User

router = APIRouter(prefix="/roles", tags=["rbac"])


class RoleSchema(BaseModel):
    id: int
    name: str
    description: str | None = None
    is_system: bool = False
    permissions_json: dict | list

    class Config:
        from_attributes = True


class CreateRoleRequest(BaseModel):
    name: str
    description: str | None = None
    permissions: dict | list


class UpdateRoleRequest(BaseModel):
    description: str | None = None
    permissions: dict | list


@router.get("", response_model=List[RoleSchema], summary="List all roles and permission matrices")
async def list_roles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all available system and custom roles."""
    stmt = select(Role).order_by(Role.id.asc())
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/permissions", summary="Get dictionary of available system permissions")
async def get_permissions_catalog(
    current_user: User = Depends(get_current_user),
):
    """Return dictionary of permission keys and human-readable descriptions."""
    return PERMISSIONS


@router.post("", response_model=RoleSchema, status_code=status.HTTP_201_CREATED, summary="Create custom role")
async def create_custom_role(
    req: CreateRoleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("users_rbac")),
):
    """Create a new custom role with specified permissions matrix."""
    name_clean = req.name.strip().lower()
    stmt = select(Role).where(Role.name == name_clean)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role '{name_clean}' already exists.",
        )

    role = Role(
        name=name_clean,
        description=req.description,
        is_system=False,
        permissions_json=req.permissions,
    )
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return role


@router.put("/{role_id}", response_model=RoleSchema, summary="Update custom role permissions")
async def update_role(
    role_id: int,
    req: UpdateRoleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("users_rbac")),
):
    """Update custom role description and permissions matrix."""
    stmt = select(Role).where(Role.id == role_id)
    res = await db.execute(stmt)
    role = res.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found.")

    if role.name.lower() in ("admin", "user"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"System protection active: Core '{role.name}' role permissions are immutable.",
        )

    if req.description is not None:
        role.description = req.description
    role.permissions_json = req.permissions

    await db.commit()
    await db.refresh(role)
    return role


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete custom role")
async def delete_role(
    role_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("users_rbac")),
):
    """Delete a custom role (system roles cannot be deleted)."""
    stmt = select(Role).where(Role.id == role_id)
    res = await db.execute(stmt)
    role = res.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found.")

    if role.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete system default roles.",
        )

    await db.delete(role)
    await db.commit()
