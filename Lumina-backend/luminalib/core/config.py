"""Core configuration module.

Only values that MUST come from the environment live here:
  • DATABASE_URL   – needed before the DB is reachable
  • JWT_SECRET     – cryptographic secret (should never be in a DB row)
  • JWT_ALGORITHM  – tied to the JWT_SECRET

Everything else (CORS, LLM, Storage, token lifetime …) is now stored
in the `app_configs` table and accessed via `dynamic_config.get_dynamic`.
"""

from __future__ import annotations

from pydantic import AnyUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────
    app_name: str = "LuminaLib"
    app_description: str = "Enterprise Library Management System with GenAI"
    app_version: str = "1.0.0"
    environment: str = "local"
    api_v1_prefix: str = "/api/v1"

    # ── Database ─────────────────────────────────────────
    database_url: AnyUrl = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/luminalib",
        alias="DATABASE_URL",
    )

    # ── JWT (secrets stay in env, never in the DB) ───────
    jwt_secret: str = Field(default="CHANGE_ME", alias="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")

    # ── Logging ──────────────────────────────────────────
    loki_url: str | None = Field(default=None, alias="LOKI_URL")

    # ── Docker Model Runner (network-level config) ───────
    docker_model_name: str = Field(default="smollm2:latest", alias="DOCKER_MODEL_NAME")
    docker_model_base_url: str = Field(
        default="http://model-runner.docker.internal/engines/v1",
        alias="DOCKER_MODEL_BASE_URL",
    )


settings = Settings()
