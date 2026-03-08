"""Dynamic configuration loaded from the app_configs database table.

This module provides an in-memory cache that is populated once during
application startup and can be refreshed via the API.  Every other
module that previously read values from `settings` should import
`get_dynamic` from here instead.
"""

from __future__ import annotations

import logging
from typing import Dict

logger = logging.getLogger("luminalib.core.dynamic_config")

# ── In-memory cache ────────────────────────────────────────────────
_cache: Dict[str, str] = {}

# ── Default values (used when a key is not yet in the database) ────
DEFAULTS: Dict[str, tuple[str, str]] = {
    # key → (default_value, description)
    "admin_email":                ("udit.rajput@hotmail.com",                          "Default admin email"),
    "admin_password":             ("Admin@12345!",                                     "Default admin password"),
    "admin_name":                 ("Udit Rajput",                                      "Default admin name"),
    "access_token_expire_minutes":("60",                                               "JWT access-token lifetime in minutes"),
    "session_timeout_minutes":    ("15",                                               "Frontend idle session timeout in minutes"),
    "llm_provider":               ("docker",                                           "LLM provider: docker | openrouter | ollama | openai | mock"),
    # Docker
    "docker_model":               ("smollm2:latest",                      "Docker container model name"),
    "docker_base_url":            ("http://model-runner.docker.internal/engines/v1", "Docker container base url"),
    # OpenRouter
    "openrouter_api_key":         ("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", "OpenRouter API key"),
    "openrouter_model":           ("meta-llama/llama-3.3-70b-instruct:free",           "OpenRouter model identifier"),
    # Ollama
    "ollama_base_url":            ("http://host.docker.internal:11434",                 "Ollama server URL"),
    "ollama_model":               ("llama3.2",                                         "Ollama model name"),
    # OpenAI
    "openai_api_key":             ("",                                                  "OpenAI API key"),
    "openai_model":               ("gpt-4o-mini",                                      "OpenAI model identifier"),
    # General
    "cors_origins":               ('["http://localhost:3000","http://localhost:5173"]',  "Allowed CORS origins (JSON array)"),
    "storage_provider":           ("local",                                            "Storage provider: local | s3"),
    "storage_path":               ("./storage",                                        "Local storage directory path"),
}


def get_dynamic(key: str, fallback: str | None = None) -> str | None:
    """Return a config value from the in-memory cache.

    Falls back to the hard-coded DEFAULTS, then to *fallback*.
    """
    if key in _cache:
        return _cache[key]
    if key in DEFAULTS:
        return DEFAULTS[key][0]
    return fallback


def get_dynamic_int(key: str, fallback: int = 0) -> int:
    """Convenience wrapper that casts to int."""
    val = get_dynamic(key)
    if val is None:
        return fallback
    try:
        return int(val)
    except (ValueError, TypeError):
        return fallback


def refresh_cache(rows: dict[str, str]) -> None:
    """Replace the cache contents.  Called during startup and optionally
    after an admin updates a config key via the API."""
    _cache.clear()
    _cache.update(rows)
    logger.info("Dynamic config cache refreshed (%d keys)", len(_cache))
