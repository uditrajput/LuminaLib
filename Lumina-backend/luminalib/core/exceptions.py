"""Custom application exceptions and FastAPI exception handlers."""

from __future__ import annotations

import logging

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("luminalib.exceptions")


class LuminaBaseException(Exception):
    """Base exception for all application errors."""

    def __init__(self, message: str = "An unexpected error occurred") -> None:
        self.message = message
        super().__init__(self.message)


class EntityNotFoundError(LuminaBaseException):
    """Raised when a requested entity does not exist."""

    def __init__(self, entity: str, identifier: int | str) -> None:
        super().__init__(f"{entity} with id={identifier} not found")


class DuplicateEntityError(LuminaBaseException):
    """Raised when a unique constraint would be violated."""

    def __init__(self, message: str = "Entity already exists") -> None:
        super().__init__(message)


class ForbiddenError(LuminaBaseException):
    """Raised when the user lacks permission."""

    def __init__(self, message: str = "Access denied") -> None:
        super().__init__(message)


# ── FastAPI exception handlers ──────────────────────────

async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    """Handle HTTPException and wrap in standard envelope."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"status": exc.status_code, "data": None, "error_message": exc.detail},
    )


async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    """Catch-all for unhandled exceptions."""
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"status": 500, "data": None, "error_message": "Internal server error"},
    )


async def lumina_exception_handler(_request: Request, exc: LuminaBaseException) -> JSONResponse:
    """Handle custom application exceptions."""
    status_code = 500
    if isinstance(exc, EntityNotFoundError):
        status_code = 404
    elif isinstance(exc, DuplicateEntityError):
        status_code = 409
    elif isinstance(exc, ForbiddenError):
        status_code = 403

    return JSONResponse(
        status_code=status_code,
        content={"status": status_code, "data": None, "error_message": exc.message},
    )
