"""User Groups (Classes/Cohorts) and Private Entitlements API endpoints."""

from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.api.v1.deps import get_db, get_current_user
from luminalib.core.rbac import require_permission, user_has_permission
from luminalib.models.user_group import UserGroup, GroupMember, BookGroupEntitlement
from luminalib.models.user import User
from luminalib.models.book import Book
from luminalib.services.user_group_service import UserGroupService

router = APIRouter(prefix="/groups", tags=["user-groups"])


class GroupMemberSchema(BaseModel):
    user_id: int
    role_in_group: str
    joined_at: str | None = None

    class Config:
        from_attributes = True


class BookEntitlementSchema(BaseModel):
    book_id: int
    assigned_at: str | None = None

    class Config:
        from_attributes = True


class UserGroupSchema(BaseModel):
    id: int
    name: str
    description: str | None = None
    created_by_user_id: int | None = None

    class Config:
        from_attributes = True


class CreateGroupRequest(BaseModel):
    name: str
    description: str | None = None


class AddMemberRequest(BaseModel):
    user_id: int
    role_in_group: str = "student"


class AssignBookRequest(BaseModel):
    book_id: int


@router.get("", response_model=List[UserGroupSchema], summary="List user groups")
async def list_groups(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List groups accessible to the user (Admins/Teachers see all; Users see their memberships)."""
    service = UserGroupService(db)
    if user_has_permission(current_user, "groups_manage"):
        return await service.list_groups()

    # Regular users see groups they are enrolled in
    stmt = (
        select(UserGroup)
        .join(GroupMember, GroupMember.group_id == UserGroup.id)
        .where(GroupMember.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("", response_model=UserGroupSchema, status_code=status.HTTP_201_CREATED, summary="Create a new class/group")
async def create_group(
    req: CreateGroupRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("groups_manage")),
):
    """Create a new user group cohort."""
    service = UserGroupService(db)
    return await service.create_group(name=req.name, description=req.description, creator_id=current_user.id)


@router.delete("/{group_id}", summary="Delete a user group")
async def delete_group(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("groups_manage")),
):
    """Delete a user group."""
    service = UserGroupService(db)
    group = await service.get_group(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")
    await service.delete_group(group_id)
    return {"message": "Group deleted successfully."}


@router.get("/{group_id}/members", summary="List members of a group")
async def get_group_members(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List members of a group."""
    service = UserGroupService(db)
    return await service.get_members(group_id)


@router.post("/{group_id}/members", summary="Add a student or teacher to a group")
async def add_member(
    group_id: int,
    req: AddMemberRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("groups_manage")),
):
    """Add a member to a group with role_in_group ('student' or 'teacher')."""
    service = UserGroupService(db)
    group = await service.get_group(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")
    await service.add_member(group_id=group_id, user_id=req.user_id, role_in_group=req.role_in_group)
    return {"message": "Member added successfully."}


@router.delete("/{group_id}/members/{user_id}", summary="Remove a member from a group")
async def remove_member(
    group_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("groups_manage")),
):
    """Remove a member from a group."""
    service = UserGroupService(db)
    await service.remove_member(group_id=group_id, user_id=user_id)
    return {"message": "Member removed successfully."}


@router.get("/{group_id}/books", summary="List private books assigned to a group")
async def get_group_books(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List books assigned to a group."""
    service = UserGroupService(db)
    return await service.get_books(group_id)


@router.post("/{group_id}/books", summary="Assign a private library book to a group")
async def assign_book_to_group(
    group_id: int,
    req: AssignBookRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("groups_manage")),
):
    """Assign a private book to a cohort."""
    service = UserGroupService(db)
    group = await service.get_group(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")
    await service.assign_book(book_id=req.book_id, group_id=group_id)
    return {"message": "Book assigned to group successfully."}


@router.delete("/{group_id}/books/{book_id}", summary="Unassign a book from a group")
async def unassign_book_from_group(
    group_id: int,
    book_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("groups_manage")),
):
    """Unassign a book from a cohort."""
    service = UserGroupService(db)
    await service.unassign_book(book_id=book_id, group_id=group_id)
    return {"message": "Book unassigned successfully."}
