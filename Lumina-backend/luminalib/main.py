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

from luminalib.api.v1.endpoints import ai, app_configs, auth, books, config, documents, ingestion, qa, recommendations, reviews, users, voice
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
    Bookmark,
    Document,
    DocumentChunk,
    Highlight,
    IngestionJob,
    Notification,
    Quiz,
    QuizAttempt,
    QuizAttemptAnswer,
    QuizAttemptEvent,
    QuizGroupEntitlement,
    QuizQuestion,
    ReadingSession,
    Review,
    SystemConfig,
    User,
    UserPreference,
    VoiceConversation,
    VoiceTurn,
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

        # Ensure roles table columns exist
        col_check = await conn.execute(text(
            "SELECT column_name FROM information_schema.columns WHERE table_name='roles'"
        ))
        existing_cols = {row[0] for row in col_check.fetchall()}
        if "is_system" not in existing_cols:
            await conn.execute(text("ALTER TABLE roles ADD COLUMN is_system BOOLEAN DEFAULT FALSE"))
            await conn.execute(text("UPDATE roles SET is_system = TRUE WHERE name IN ('admin', 'teacher', 'user')"))
        if "description" not in existing_cols:
            await conn.execute(text("ALTER TABLE roles ADD COLUMN description TEXT"))
        if "permissions_json" not in existing_cols:
            await conn.execute(text("ALTER TABLE roles ADD COLUMN permissions_json JSONB DEFAULT '[]'::jsonb"))
        if "created_at" not in existing_cols:
            await conn.execute(text("ALTER TABLE roles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()"))

        # Ensure users table columns exist
        u_check = await conn.execute(text(
            "SELECT column_name FROM information_schema.columns WHERE table_name='users'"
        ))
        u_cols = {row[0] for row in u_check.fetchall()}
        if "status" not in u_cols:
            await conn.execute(text("ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'ACTIVE'"))
        if "email_verified" not in u_cols:
            await conn.execute(text("ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT TRUE"))
        if "verification_token" not in u_cols:
            await conn.execute(text("ALTER TABLE users ADD COLUMN verification_token VARCHAR(255)"))
        if "failed_login_attempts" not in u_cols:
            await conn.execute(text("ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0 NOT NULL"))
        if "is_locked" not in u_cols:
            await conn.execute(text("ALTER TABLE users ADD COLUMN is_locked BOOLEAN DEFAULT FALSE NOT NULL"))
        if "profile_completed" not in u_cols:
            await conn.execute(text("ALTER TABLE users ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE NOT NULL"))
        if "dob" not in u_cols:
            await conn.execute(text("ALTER TABLE users ADD COLUMN dob VARCHAR(50)"))
        if "profession" not in u_cols:
            await conn.execute(text("ALTER TABLE users ADD COLUMN profession VARCHAR(100)"))
        if "hobbies" not in u_cols:
            await conn.execute(text("ALTER TABLE users ADD COLUMN hobbies JSON"))
        if "interests" not in u_cols:
            await conn.execute(text("ALTER TABLE users ADD COLUMN interests JSON"))
        if "favorite_topics" not in u_cols:
            await conn.execute(text("ALTER TABLE users ADD COLUMN favorite_topics JSON"))
        if "favorite_genres" not in u_cols:
            await conn.execute(text("ALTER TABLE users ADD COLUMN favorite_genres JSON"))
        if "reading_preferences" not in u_cols:
            await conn.execute(text("ALTER TABLE users ADD COLUMN reading_preferences JSON"))
        if "preferred_language" not in u_cols:
            await conn.execute(text("ALTER TABLE users ADD COLUMN preferred_language VARCHAR(50)"))
        if "education_records" not in u_cols:
            await conn.execute(text("ALTER TABLE users ADD COLUMN education_records JSON"))
        if "contact_info" not in u_cols:
            await conn.execute(text("ALTER TABLE users ADD COLUMN contact_info JSON"))

        # Ensure books table columns exist
        b_check = await conn.execute(text(
            "SELECT column_name FROM information_schema.columns WHERE table_name='books'"
        ))
        b_cols = {row[0] for row in b_check.fetchall()}
        if "access_level" not in b_cols:
            await conn.execute(text("ALTER TABLE books ADD COLUMN access_level VARCHAR(20) DEFAULT 'public'"))
        if "created_by_user_id" not in b_cols:
            await conn.execute(text("ALTER TABLE books ADD COLUMN created_by_user_id INTEGER"))

        if old_col and old_col[1] in ('character varying', 'text'):
            logger.info("Detected old users.role VARCHAR column — migrating to role_id FK…")

            for rn in ('admin', 'teacher', 'user', 'librarian'):
                exists = await conn.execute(text(
                    "SELECT id FROM roles WHERE name = :n"
                ), {"n": rn})
                if not exists.fetchone():
                    await conn.execute(text(
                        "INSERT INTO roles (name, is_system, created_by, updated_by, created_date, updated_date) "
                        "VALUES (:n, TRUE, 'system', 'system', NOW(), NOW())"
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

        # Seed Roles (idempotent) with permissions — v4.0
        from luminalib.core.rbac import DEFAULT_ROLE_PERMISSIONS

        for role_name in ["admin", "teacher", "user", "librarian"]:
            result = await session.execute(select(Role).where(Role.name == role_name))
            role = result.scalar_one_or_none()
            perms = DEFAULT_ROLE_PERMISSIONS.get(role_name, [])
            # librarian inherits teacher perms if no explicit entry
            if role_name == "librarian" and not perms:
                perms = DEFAULT_ROLE_PERMISSIONS.get("teacher", [])
            perms_dict = {p: True for p in perms} if role_name != "admin" else {p: True for p in DEFAULT_ROLE_PERMISSIONS["admin"]}
            if not role:
                session.add(Role(name=role_name, is_system=True, permissions_json=perms_dict, description=f"System role: {role_name}", created_by="system", updated_by="system"))
            else:
                # Upgrade existing role if missing quiz perms
                existing = role.permissions_json or {}
                if isinstance(existing, list):
                    existing = {p: True for p in existing}
                needs_update = any(p not in existing for p in perms)
                if needs_update or not role.is_system:
                    role.permissions_json = {**existing, **perms_dict}
                    role.is_system = True
        await session.commit()
        # Ensure admin has all perms (including quiz_*)
        adm_res = await session.execute(select(Role).where(Role.name == "admin"))
        adm_role = adm_res.scalar_one_or_none()
        if adm_role:
            from luminalib.core.rbac import PERMISSIONS
            adm_role.permissions_json = {k: True for k in PERMISSIONS.keys()}
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

        # Clean legacy font / mojibake in existing books
        try:
            from luminalib.services.devanagari_converter import is_likely_legacy_devanagari, clean_and_normalize_devanagari
            books_res = await session.execute(select(Book))
            cleaned_count = 0
            for b in books_res.scalars().all():
                modified = False
                if b.description and is_likely_legacy_devanagari(b.description):
                    b.description = clean_and_normalize_devanagari(b.description)
                    modified = True
                if b.title and is_likely_legacy_devanagari(b.title):
                    b.title = clean_and_normalize_devanagari(b.title)
                    modified = True
                if b.author and is_likely_legacy_devanagari(b.author):
                    b.author = clean_and_normalize_devanagari(b.author)
                    modified = True
                if modified:
                    session.add(b)
                    cleaned_count += 1
            if cleaned_count > 0:
                await session.commit()
                logger.info("Cleaned and normalized Devanagari text in %d existing book(s).", cleaned_count)
        except Exception as e:
            logger.warning("Notice: Book Devanagari cleanup on startup: %s", e)


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

from luminalib.api.v1.endpoints import admin_dashboard, ai, app_configs, audiobook, auth, books, config, discussions, documents, groups, ingestion, notifications, progress, qa, quizzes, recommendations, reviews, roles, search, study, users, voice

# ── Routers ─────────────────────────────────────────────
_prefix = settings.api_v1_prefix

app.include_router(auth.router, prefix=_prefix)
app.include_router(users.router, prefix=_prefix)
app.include_router(roles.router, prefix=_prefix)
app.include_router(groups.router, prefix=_prefix)
app.include_router(quizzes.router, prefix=_prefix)
app.include_router(study.router, prefix=_prefix)
app.include_router(audiobook.router, prefix=_prefix)
app.include_router(discussions.router, prefix=_prefix)
app.include_router(search.router, prefix=_prefix)
app.include_router(progress.router, prefix=_prefix)
app.include_router(notifications.router, prefix=_prefix)
app.include_router(books.router, prefix=_prefix)
app.include_router(reviews.router, prefix=_prefix)
app.include_router(recommendations.router, prefix=_prefix)
app.include_router(config.router, prefix=_prefix)
app.include_router(documents.router, prefix=_prefix)
app.include_router(ingestion.router, prefix=_prefix)
app.include_router(qa.router, prefix=_prefix)
app.include_router(ai.router, prefix=_prefix)
app.include_router(app_configs.router, prefix=_prefix)
app.include_router(voice.router, prefix=_prefix)
app.include_router(admin_dashboard.router, prefix=_prefix)


# ── Health check ────────────────────────────────────────

@app.get(_prefix, tags=["health"], summary="API v1 root check")
async def api_v1_root() -> dict[str, str]:
    return {
        "status": "online",
        "name": settings.app_name,
        "version": settings.app_version,
    }


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


@app.get("/avatars/{filename}", tags=["avatars"], summary="Serve an uploaded avatar image")
async def serve_avatar(filename: str):
    storage_path = get_dynamic("storage_path", "./storage")
    avatars_dir = _Path(storage_path) / "avatars"
    avatars_dir.mkdir(parents=True, exist_ok=True)
    file_path = avatars_dir / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Avatar image not found")
    return FileResponse(file_path)


# ── Dev runner ──────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("luminalib.main:app", host="0.0.0.0", port=8000, reload=True)
