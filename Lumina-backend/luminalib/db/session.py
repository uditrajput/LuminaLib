"""Async database session management."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from luminalib.core.config import settings

engine = create_async_engine(str(settings.database_url), echo=False, pool_pre_ping=True)

SessionLocal = async_sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)


async def get_session() -> AsyncSession:
    """Yield an async database session."""
    async with SessionLocal() as session:
        yield session
