"""Generic base repository with CRUD operations."""

from __future__ import annotations

import logging
from typing import Any, Generic, Sequence, Type, TypeVar

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.db.base import Base

ModelT = TypeVar("ModelT", bound=Base)
logger = logging.getLogger("luminalib.repositories.base")


class BaseRepository(Generic[ModelT]):
    """Provides generic async CRUD operations for any SQLAlchemy model."""

    def __init__(self, model: Type[ModelT], session: AsyncSession) -> None:
        self.model = model
        self.session = session

    async def get_by_id(self, entity_id: int) -> ModelT | None:
        result = await self.session.execute(
            select(self.model).where(self.model.id == entity_id)
        )
        return result.scalar_one_or_none()

    async def get_all(self) -> Sequence[ModelT]:
        result = await self.session.execute(select(self.model))
        return result.scalars().all()

    async def get_paginated(
        self,
        page: int = 1,
        size: int = 10,
        order_by: Any = None,
    ) -> tuple[Sequence[ModelT], int]:
        """Return (items, total_count) for the given page."""
        count_result = await self.session.execute(select(func.count(self.model.id)))
        total = count_result.scalar_one()

        query = select(self.model)
        if order_by is not None:
            query = query.order_by(order_by)
        query = query.offset((page - 1) * size).limit(size)

        result = await self.session.execute(query)
        return result.scalars().all(), total

    async def create(self, entity: ModelT) -> ModelT:
        self.session.add(entity)
        await self.session.commit()
        await self.session.refresh(entity)
        logger.debug("Created %s id=%s", self.model.__tablename__, entity.id)
        return entity

    async def update(self, entity: ModelT) -> ModelT:
        await self.session.commit()
        await self.session.refresh(entity)
        logger.debug("Updated %s id=%s", self.model.__tablename__, entity.id)
        return entity

    async def delete(self, entity: ModelT) -> None:
        await self.session.delete(entity)
        await self.session.commit()
        logger.debug("Deleted %s id=%s", self.model.__tablename__, entity.id)
