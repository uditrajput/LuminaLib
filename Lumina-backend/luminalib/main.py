"""LuminaLib — FastAPI Application Entry Point.

Features:
  • Clean Architecture (API → Service → Repository → DB)
  • Audit logging (created_by, created_date, updated_by, updated_date)
  • Interface-driven LLM & Storage (factory pattern)
  • Runtime configuration endpoint for provider switching
  • Dynamic configuration from app_configs DB table
  • Swagger UI at /docs, ReDoc at /redoc
"""

from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from sqlalchemy import select

from luminalib.api.v1.endpoints import ai, app_configs, auth, books, config, documents, ingestion, qa, recommendations, reviews, users
from luminalib.core.config import settings
from luminalib.core.dynamic_config import DEFAULTS, get_dynamic, refresh_cache
from luminalib.core.exceptions import (
    LuminaBaseException,
    http_exception_handler,
    lumina_exception_handler,
    unhandled_exception_handler,
)
from luminalib.core.logging_config import configure_logging
from luminalib.core.middleware import response_wrapper_middleware
from luminalib.core.security import hash_password
from luminalib.db.base import Base
from luminalib.db.session import SessionLocal, engine

# Import all models so SQLAlchemy discovers them
from luminalib.models import (  # noqa: F401
    Book,
    BookBorrow,
    Document,
    DocumentChunk,
    IngestionJob,
    Review,
    SystemConfig,
    User,
    UserPreference,
)

# ── Logging ─────────────────────────────────────────────
configure_logging()
logger = logging.getLogger("luminalib")


# ── Lifespan ────────────────────────────────────────────

from luminalib.models.app_config import AppConfig
from luminalib.models.role import Role


async def _migrate_role_schema() -> None:
    """Migrate old users.role VARCHAR column to users.role_id FK if needed."""
    from sqlalchemy import text

    async with engine.begin() as conn:
        result = await conn.execute(text(
            "SELECT column_name, data_type FROM information_schema.columns "
            "WHERE table_name='users' AND column_name='role'"
        ))
        old_col = result.fetchone()

        if old_col and old_col[1] in ('character varying', 'text'):
            logger.info("Detected old users.role VARCHAR column — migrating to role_id FK…")

            for rn in ('admin', 'user', 'librarian'):
                exists = await conn.execute(text(
                    "SELECT id FROM roles WHERE name = :n"
                ), {"n": rn})
                if not exists.fetchone():
                    await conn.execute(text(
                        "INSERT INTO roles (name, created_by, updated_by, created_date, updated_date) "
                        "VALUES (:n, 'system', 'system', NOW(), NOW())"
                    ), {"n": rn})

            rid_check = await conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='users' AND column_name='role_id'"
            ))
            if not rid_check.fetchone():
                await conn.execute(text(
                    "ALTER TABLE users ADD COLUMN role_id INTEGER"
                ))

            await conn.execute(text(
                "UPDATE users SET role_id = r.id FROM roles r WHERE users.role = r.name"
            ))
            await conn.execute(text(
                "UPDATE users SET role_id = (SELECT id FROM roles WHERE name='user') "
                "WHERE role_id IS NULL"
            ))

            await conn.execute(text(
                "ALTER TABLE users ALTER COLUMN role_id SET NOT NULL"
            ))
            fk_check = await conn.execute(text(
                "SELECT 1 FROM information_schema.table_constraints "
                "WHERE constraint_name='fk_users_role_id' AND table_name='users'"
            ))
            if not fk_check.fetchone():
                await conn.execute(text(
                    "ALTER TABLE users ADD CONSTRAINT fk_users_role_id "
                    "FOREIGN KEY (role_id) REFERENCES roles(id)"
                ))

            await conn.execute(text(
                "ALTER TABLE users DROP COLUMN role"
            ))

            logger.info("Migration complete: users.role → users.role_id")


async def _load_dynamic_config(session) -> None:
    """Seed default app_configs and populate the in-memory cache."""
    # Seed every key listed in DEFAULTS (idempotent)
    for key, (default_val, desc) in DEFAULTS.items():
        result = await session.execute(select(AppConfig).where(AppConfig.key == key))
        if not result.scalar_one_or_none():
            session.add(AppConfig(
                key=key, value=default_val, description=desc,
                created_by="system", updated_by="system",
            ))
    await session.commit()

    # Load all rows into the in-memory cache
    result = await session.execute(select(AppConfig))
    rows = {r.key: r.value for r in result.scalars().all()}
    refresh_cache(rows)


async def _init_models() -> None:
    """Create tables, run migrations, and seed admin user."""
    # 1. Create any missing tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 2. Run schema migration for old → new role system
    await _migrate_role_schema()

    # 3. Seed & load dynamic config from DB
    from luminalib.db.backup import export_database, import_database

    async with SessionLocal() as session:
        await import_database(session)
        from luminalib.db.backup import import_sql_dump
        await import_sql_dump(session)
        await session.commit()

        await _load_dynamic_config(session)

        # Seed Roles (idempotent)
        for role_name in ["admin", "user", "librarian"]:
            result = await session.execute(select(Role).where(Role.name == role_name))
            if not result.scalar_one_or_none():
                session.add(Role(name=role_name, created_by="system", updated_by="system"))
        await session.commit()

        # Seed Admin User
        admin_email = get_dynamic("admin_email")
        admin_pass = get_dynamic("admin_password")
        admin_name = get_dynamic("admin_name")

        result = await session.execute(select(User).where(User.email == admin_email))
        if not result.scalar_one_or_none():
            r_obj = await session.execute(select(Role).where(Role.name == "admin"))
            admin_role = r_obj.scalar_one()
            admin = User(
                email=admin_email,
                hashed_password=hash_password(admin_pass),
                role_id=admin_role.id,
                full_name=admin_name,
                bio="Library Administrator",
                created_by="system",
                updated_by="system",
            )
            session.add(admin)
            await session.commit()
            logger.info("Admin user seeded: %s", admin_email)

        # Seed default system_config if missing
        result = await session.execute(select(SystemConfig).limit(1))
        if not result.scalar_one_or_none():
            cfg = SystemConfig(
                llm_provider=get_dynamic("llm_provider", "mock"),
                storage_provider=get_dynamic("storage_provider", "local"),
                recommendation_engine="content_based",
                created_by="system",
                updated_by="system",
            )
            session.add(cfg)
            await session.commit()
            logger.info("Default system config seeded")

        # Backup database after seeding
        await export_database(session)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Startup / shutdown lifecycle."""
    await _init_models()
    logger.info("🚀 LuminaLib backend started — %s", settings.environment)
    yield
    logger.info("👋 LuminaLib backend shutting down")
    
    # Backup the database on graceful shutdown
    from luminalib.db.backup import export_database
    from luminalib.db.session import SessionLocal
    async with SessionLocal() as session:
        await export_database(session)


# ── App creation ────────────────────────────────────────

app = FastAPI(
    title=settings.app_name,
    description=settings.app_description,
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# ── Dynamic CORS (reads origins from app_configs cache) ─

def _get_cors_origins() -> list[str]:
    """Parse CORS origins from the dynamic config cache."""
    raw = get_dynamic("cors_origins", '["http://localhost:3000"]')
    try:
        origins = json.loads(raw)
        if isinstance(origins, list):
            return origins
    except (json.JSONDecodeError, TypeError):
        pass
    return [o.strip() for o in raw.split(",") if o.strip()]


from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response as StarletteResponse


class DynamicCORSMiddleware(BaseHTTPMiddleware):
    """CORS middleware that reads allowed origins from the DB-backed config cache."""

    async def dispatch(self, request: StarletteRequest, call_next):
        origin = request.headers.get("origin")
        allowed = _get_cors_origins()

        # Handle preflight
        if request.method == "OPTIONS" and origin:
            if origin in allowed or "*" in allowed:
                return StarletteResponse(
                    status_code=200,
                    headers={
                        "Access-Control-Allow-Origin": origin,
                        "Access-Control-Allow-Credentials": "true",
                        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                        "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept",
                        "Access-Control-Max-Age": "600",
                    },
                )

        response = await call_next(request)

        if origin and (origin in allowed or "*" in allowed):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Accept"

        return response


app.add_middleware(DynamicCORSMiddleware)

# ── Response wrapper ────────────────────────────────────
app.middleware("http")(response_wrapper_middleware)

# ── Exception handlers ──────────────────────────────────
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(LuminaBaseException, lumina_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# ── Routers ─────────────────────────────────────────────
_prefix = settings.api_v1_prefix

app.include_router(auth.router, prefix=_prefix)
app.include_router(users.router, prefix=_prefix)
app.include_router(books.router, prefix=_prefix)
app.include_router(reviews.router, prefix=_prefix)
app.include_router(recommendations.router, prefix=_prefix)
app.include_router(config.router, prefix=_prefix)
app.include_router(documents.router, prefix=_prefix)
app.include_router(ingestion.router, prefix=_prefix)
app.include_router(qa.router, prefix=_prefix)
app.include_router(ai.router, prefix=_prefix)
app.include_router(app_configs.router, prefix=_prefix)


# ── Health check ────────────────────────────────────────

@app.get("/health", tags=["health"], summary="Application health check")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


# ── Cover image serving ─────────────────────────────────

from pathlib import Path as _Path
from fastapi.responses import FileResponse


@app.get("/covers/{filename}", tags=["covers"], summary="Serve an uploaded cover image")
async def serve_cover(filename: str):
    storage_path = get_dynamic("storage_path", "./storage")
    covers_dir = _Path(storage_path) / "covers"
    covers_dir.mkdir(parents=True, exist_ok=True)
    file_path = covers_dir / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Cover image not found")
    return FileResponse(file_path)


# ── Dev runner ──────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("luminalib.main:app", host="0.0.0.0", port=8000, reload=True)
