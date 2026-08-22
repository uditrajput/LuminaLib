"""Business logic service for User Groups (Classes/Cohorts) and Private Library Book Entitlements."""

from __future__ import annotations

from typing import List, Optional
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.models.user_group import UserGroup, GroupMember, BookGroupEntitlement
from luminalib.models.user import User
from luminalib.models.book import Book


class UserGroupService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_groups(self, creator_id: Optional[int] = None) -> List[UserGroup]:
        """List all user groups, optionally filtered by creator."""
        stmt = select(UserGroup).order_by(UserGroup.name.asc())
        if creator_id is not None:
            stmt = stmt.where(UserGroup.created_by_user_id == creator_id)
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_group(self, group_id: int) -> Optional[UserGroup]:
        """Retrieve group by ID."""
        stmt = select(UserGroup).where(UserGroup.id == group_id)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def create_group(self, name: str, description: Optional[str], creator_id: int) -> UserGroup:
        """Create a new user group."""
        group = UserGroup(name=name, description=description, created_by_user_id=creator_id)
        self.db.add(group)
        await self.db.flush()
        # Automatically add creator as teacher in group
        member = GroupMember(group_id=group.id, user_id=creator_id, role_in_group="teacher")
        self.db.add(member)
        await self.db.commit()
        await self.db.refresh(group)
        return group

    async def add_member(self, group_id: int, user_id: int, role_in_group: str = "student") -> GroupMember:
        """Add a user or teacher to a group."""
        stmt = select(GroupMember).where(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
        res = await self.db.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            existing.role_in_group = role_in_group
            await self.db.commit()
            return existing

        member = GroupMember(group_id=group_id, user_id=user_id, role_in_group=role_in_group)
        self.db.add(member)
        await self.db.commit()
        return member

    async def remove_member(self, group_id: int, user_id: int) -> None:
        """Remove a member from a group."""
        stmt = delete(GroupMember).where(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
        await self.db.execute(stmt)
        await self.db.commit()

    async def assign_book(self, book_id: int, group_id: int) -> BookGroupEntitlement:
        """Entitle a private book to a user group."""
        stmt = select(BookGroupEntitlement).where(
            BookGroupEntitlement.book_id == book_id, BookGroupEntitlement.group_id == group_id
        )
        res = await self.db.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            return existing

        entitlement = BookGroupEntitlement(book_id=book_id, group_id=group_id)
        self.db.add(entitlement)
        await self.db.commit()
        return entitlement

    async def get_members(self, group_id: int) -> List[dict]:
        """Get members of a group with user details."""
        stmt = (
            select(GroupMember, User)
            .join(User, User.id == GroupMember.user_id)
            .where(GroupMember.group_id == group_id)
        )
        res = await self.db.execute(stmt)
        members = []
        for gm, u in res.all():
            members.append({
                "user_id": u.id,
                "full_name": u.full_name,
                "email": u.email,
                "role_in_group": gm.role_in_group,
                "joined_at": str(gm.joined_at) if hasattr(gm, "joined_at") and gm.joined_at else None,
            })
        return members

    async def get_books(self, group_id: int) -> List[dict]:
        """Get books assigned to a group."""
        stmt = (
            select(BookGroupEntitlement, Book)
            .join(Book, Book.id == BookGroupEntitlement.book_id)
            .where(BookGroupEntitlement.group_id == group_id)
        )
        res = await self.db.execute(stmt)
        books = []
        for ent, b in res.all():
            books.append({
                "book_id": b.id,
                "title": b.title,
                "author": b.author,
                "access_level": getattr(b, "access_level", "private"),
            })
        return books

    async def unassign_book(self, book_id: int, group_id: int) -> None:
        """Unassign a book from a group."""
        stmt = delete(BookGroupEntitlement).where(
            BookGroupEntitlement.book_id == book_id, BookGroupEntitlement.group_id == group_id
        )
        await self.db.execute(stmt)
        await self.db.commit()

    async def delete_group(self, group_id: int) -> None:
        """Delete a group and its associated memberships/entitlements."""
        await self.db.execute(delete(GroupMember).where(GroupMember.group_id == group_id))
        await self.db.execute(delete(BookGroupEntitlement).where(BookGroupEntitlement.group_id == group_id))
        await self.db.execute(delete(UserGroup).where(UserGroup.id == group_id))
        await self.db.commit()

    async def get_user_authorized_book_ids(self, user_id: int) -> List[int]:
        """Get IDs of all private books the user is authorized to read (Admin, Creator, or Entitled Group Member)."""
        from sqlalchemy import or_
        user_stmt = select(User).where(User.id == user_id)
        user_res = await self.db.execute(user_stmt)
        user_obj = user_res.scalar_one_or_none()

        if user_obj and (getattr(user_obj, "role_id", None) == 1 or (user_obj.role and user_obj.role.name.lower() == "admin")):
            # Admins have access to all private books
            all_stmt = select(Book.id).where(Book.access_level == "private")
            all_res = await self.db.execute(all_stmt)
            return list(all_res.scalars().all())

        authorized_ids = set()

        # Include private books created by this user (uploader/teacher)
        created_stmt = select(Book.id).where(Book.access_level == "private", Book.created_by_user_id == user_id)
        created_res = await self.db.execute(created_stmt)
        authorized_ids.update(created_res.scalars().all())

        # Include private books entitled via group memberships
        entitled_stmt = (
            select(BookGroupEntitlement.book_id)
            .join(GroupMember, GroupMember.group_id == BookGroupEntitlement.group_id)
            .where(GroupMember.user_id == user_id)
        )
        ent_res = await self.db.execute(entitled_stmt)
        authorized_ids.update(ent_res.scalars().all())

        return list(authorized_ids)

