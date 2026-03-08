"""Application-wide constants."""

from __future__ import annotations

# ── Roles ───────────────────────────────────────────────
ROLE_ADMIN = "admin"
ROLE_USER = "user"

# ── Pagination defaults ────────────────────────────────
DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 50

# ── Borrow status labels ──────────────────────────────
BORROW_STATUS_AVAILABLE = "Available"
BORROW_STATUS_BORROWED = "Borrowed"
BORROW_STATUS_RETURNED = "Returned"

# ── System config keys ────────────────────────────────
CONFIG_LLM_PROVIDER = "llm_provider"
CONFIG_STORAGE_PROVIDER = "storage_provider"
CONFIG_RECOMMENDATION_ENGINE = "recommendation_engine"
