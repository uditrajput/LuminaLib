"""User repository."""

from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from luminalib.models.user import User
from luminalib.models.role import Role
from luminalib.repositories.base_repository import BaseRepository


class UserRepository(BaseRepository[User]):
    """User-specific data access."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(User, session)

    async def get_by_email(self, email: str) -> User | None:
        result = await self.session.execute(
            select(User)
            .options(selectinload(User.role))
            .where(func.lower(User.email) == email.lower())
        )
        return result.scalar_one_or_none()

    async def get_role_by_name(self, name: str) -> Role | None:
        result = await self.session.execute(select(Role).where(Role.name == name))
        return result.scalar_one_or_none()

    async def search_paginated(
        self,
        page: int = 1,
        size: int = 20,
        search: str | None = None,
        role: str | None = None,
    ) -> tuple[list[User], int]:
        """Return (items, total) with optional search and role filter."""
        query = select(User).join(User.role).options(selectinload(User.role))
        count_query = select(func.count(User.id)).join(User.role)

        filters = []
        if search:
            pattern = f"%{search}%"
            filters.append(
                or_(
                    User.email.ilike(pattern),
                    User.full_name.ilike(pattern),
                )
            )
        if role:
            filters.append(Role.name == role)

        if filters:
            from sqlalchemy import and_
            combined = and_(*filters)
            query = query.where(combined)
            count_query = count_query.where(combined)

        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        query = query.order_by(User.created_date.desc()).offset((page - 1) * size).limit(size)
        result = await self.session.execute(query)
        return list(result.scalars().all()), total

    async def get_stats(self) -> dict:
        """Return aggregate statistics for the user admin dashboard."""
        total_res = await self.session.execute(select(func.count(User.id)))
        total = total_res.scalar_one()

        admin_res = await self.session.execute(
            select(func.count(User.id)).join(User.role).where(Role.name == "admin")
        )
        admins = admin_res.scalar_one()

        newest_res = await self.session.execute(
            select(User.email).order_by(User.created_date.desc()).limit(1)
        )
        newest_email = newest_res.scalar_one_or_none()

        return {
            "total": total,
            "admins": admins,
            "regular_users": total - admins,
            "newest_user_email": newest_email,
        }

