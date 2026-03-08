"""API dependency injection — shared FastAPI dependencies."""

from __future__ import annotations

import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.core.security import decode_access_token
from luminalib.db.session import get_session
from luminalib.infrastructure.llm.llm_factory import get_llm_provider
from luminalib.infrastructure.storage.storage_factory import get_storage_provider
from luminalib.interfaces.llm_interface import LLMInterface
from luminalib.interfaces.storage_interface import StorageInterface
from luminalib.models.system_config import SystemConfig
from luminalib.models.user import User
from luminalib.repositories.book_repository import BookRepository
from luminalib.repositories.borrow_repository import BorrowRepository
from luminalib.repositories.config_repository import ConfigRepository
from luminalib.repositories.document_repository import DocumentRepository
from luminalib.repositories.review_repository import ReviewRepository
from luminalib.repositories.user_repository import UserRepository
from luminalib.repositories.app_config_repository import AppConfigRepository
from luminalib.services.auth_service import AuthService
from luminalib.services.book_service import BookService
from luminalib.services.config_service import ConfigService
from luminalib.services.review_service import ReviewService
from luminalib.services.app_config_service import AppConfigService

logger = logging.getLogger("luminalib.api.deps")
bearer_scheme = HTTPBearer()


# ── Database session ────────────────────────────────────

async def get_db(session: AsyncSession = Depends(get_session)) -> AsyncSession:
    """Yield an async database session."""
    yield session


# ── Current user ────────────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_db),
) -> User:
    """Decode JWT and return the authenticated user."""
    email = decode_access_token(credentials.credentials)
    from sqlalchemy.orm import selectinload
    result = await session.execute(
        select(User).options(selectinload(User.role)).where(User.email == email)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="This account has been deactivated"
        )
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    """Ensure the current user has admin role."""
    if user.role.name != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )
    return user


# ── Infrastructure providers (config-aware) ─────────────

async def _get_system_config(session: AsyncSession) -> SystemConfig | None:
    """Load runtime system config for factory overrides."""
    result = await session.execute(select(SystemConfig).limit(1))
    return result.scalar_one_or_none()


async def get_storage(session: AsyncSession = Depends(get_db)) -> StorageInterface:
    """Return the active storage provider, respecting system_config overrides."""
    sys_config = await _get_system_config(session)
    override = sys_config.storage_provider if sys_config else None
    return await get_storage_provider(provider_override=override)


async def get_llm(session: AsyncSession = Depends(get_db)) -> LLMInterface:
    """Return the active LLM provider, respecting system_config overrides."""
    sys_config = await _get_system_config(session)
    if sys_config:
        return await get_llm_provider(
            provider_override=sys_config.llm_provider,
            api_key_override=sys_config.llm_api_key,
            base_url_override=sys_config.llm_base_url,
            model_override=sys_config.llm_model,
        )
    return await get_llm_provider()


# ── Repository factories ───────────────────────────────

def get_user_repo(session: AsyncSession = Depends(get_db)) -> UserRepository:
    return UserRepository(session)


def get_book_repo(session: AsyncSession = Depends(get_db)) -> BookRepository:
    return BookRepository(session)


def get_review_repo(session: AsyncSession = Depends(get_db)) -> ReviewRepository:
    return ReviewRepository(session)


def get_borrow_repo(session: AsyncSession = Depends(get_db)) -> BorrowRepository:
    return BorrowRepository(session)


def get_config_repo(session: AsyncSession = Depends(get_db)) -> ConfigRepository:
    return ConfigRepository(session)


def get_document_repo(session: AsyncSession = Depends(get_db)) -> DocumentRepository:
    return DocumentRepository(session)


# ── Service factories ──────────────────────────────────

async def get_auth_service(
    user_repo: UserRepository = Depends(get_user_repo),
) -> AuthService:
    return AuthService(user_repo)


async def get_book_service(
    book_repo: BookRepository = Depends(get_book_repo),
    storage: StorageInterface = Depends(get_storage),
    llm: LLMInterface = Depends(get_llm),
) -> BookService:
    return BookService(book_repo, storage, llm)


async def get_review_service(
    review_repo: ReviewRepository = Depends(get_review_repo),
    book_repo: BookRepository = Depends(get_book_repo),
    borrow_repo: BorrowRepository = Depends(get_borrow_repo),
    llm: LLMInterface = Depends(get_llm),
) -> ReviewService:
    return ReviewService(review_repo, book_repo, borrow_repo, llm)


async def get_config_service(
    config_repo: ConfigRepository = Depends(get_config_repo),
) -> ConfigService:
    return ConfigService(config_repo)


def get_app_config_repo(session: AsyncSession = Depends(get_db)) -> AppConfigRepository:
    return AppConfigRepository(session)


async def get_app_config_service(
    repo: AppConfigRepository = Depends(get_app_config_repo),
) -> AppConfigService:
    return AppConfigService(repo)
