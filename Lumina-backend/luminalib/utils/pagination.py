"""Pagination utilities."""

from __future__ import annotations

from luminalib.core.constants import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE


def normalise_pagination(page: int, size: int) -> tuple[int, int]:
    """Clamp page/size to valid ranges."""
    page = max(page, 1)
    size = min(max(size, 1), MAX_PAGE_SIZE)
    return page, size
