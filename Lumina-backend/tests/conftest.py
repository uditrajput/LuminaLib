import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from luminalib.main import app
from luminalib.api.v1.deps import get_db, get_current_user, require_admin
from luminalib.db.base import Base
from luminalib.models.user import User
from luminalib.models.role import Role
from luminalib.models.system_config import SystemConfig

# Use in-memory SQLite for fast testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestingSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)

@pytest_asyncio.fixture(scope="function")
async def db_session():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestingSessionLocal() as session:
        # Seed basic roles and user
        admin_role = Role(id=1, name="admin", created_by="test", updated_by="test")
        user_role = Role(id=2, name="user", created_by="test", updated_by="test")
        session.add_all([admin_role, user_role])
        await session.flush()
        
        test_user = User(
            id=1, email="test@test.com", hashed_password="pw", 
            role_id=2, is_active=True, created_by="t", updated_by="t"
        )
        admin_user = User(
            id=2, email="admin@test.com", hashed_password="pw", 
            role_id=1, is_active=True, bio="Library Administrator",
            created_by="t", updated_by="t"
        )
        sys_config = SystemConfig(
            id=1, llm_provider="mock", storage_provider="local", recommendation_engine="none",
            created_by="t", updated_by="t"
        )
        session.add_all([test_user, admin_user, sys_config])
        await session.commit()
        
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture(scope="function")
async def client(db_session):
    async def override_get_db():
        yield db_session
        
    async def override_get_current_user():
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        result = await db_session.execute(select(User).options(selectinload(User.role)).where(User.id == 1))
        return result.scalar_one()

    async def override_require_admin():
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        result = await db_session.execute(select(User).options(selectinload(User.role)).where(User.id == 2))
        return result.scalar_one()

    import luminalib.db.session
    luminalib.db.session.SessionLocal = TestingSessionLocal

    async def override_get_storage():
        from unittest.mock import AsyncMock
        mock = AsyncMock()
        mock.upload.return_value = "mock_path.txt"
        return mock

    from luminalib.api.v1.deps import get_storage, get_llm
    from unittest.mock import AsyncMock, MagicMock
    
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[require_admin] = override_require_admin
    app.dependency_overrides[get_storage] = override_get_storage
    
    # Mock LLM provider to avoid external calls
    async def override_get_llm():
        mock_llm = AsyncMock()
        mock_llm.summarize.return_value = "Mocked Summary"
        mock_llm.analyze_review.return_value = "Mocked Analysis"
        mock_llm._call.return_value = "Mocked AI Answer"
        return mock_llm
    app.dependency_overrides[get_llm] = override_get_llm

    # Global BackgroundTasks override to prevent async loop issues in tests
    from fastapi import BackgroundTasks
    mock_bg = MagicMock(spec=BackgroundTasks)
    app.dependency_overrides[BackgroundTasks] = lambda: mock_bg

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

    app.dependency_overrides.clear()
