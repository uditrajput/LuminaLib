"""Document repository."""

from __future__ import annotations

from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.models.document import Document
from luminalib.repositories.base_repository import BaseRepository


class DocumentRepository(BaseRepository[Document]):
    """Document-specific data access."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Document, session)

    async def get_by_owner(self, owner_id: int) -> Sequence[Document]:
        result = await self.session.execute(
            select(Document).where(Document.owner_id == owner_id)
        )
        return result.scalars().all()

    async def get_by_id_and_owner(self, doc_id: int, owner_id: int) -> Document | None:
        result = await self.session.execute(
            select(Document).where(Document.id == doc_id, Document.owner_id == owner_id)
        )
        return result.scalar_one_or_none()
