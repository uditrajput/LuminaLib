"""HTTP middleware for response wrapping and request logging."""

from __future__ import annotations

import json
import logging
import time

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.responses import Response

logger = logging.getLogger("luminalib.middleware")

# Paths excluded from response wrapping (Swagger / OpenAPI)
EXCLUDED_PATHS = {"/openapi.json", "/docs", "/docs/oauth2-redirect", "/redoc"}


async def response_wrapper_middleware(request: Request, call_next) -> Response:
    """Wrap all JSON responses in a standard envelope: {status, data, error_message}."""
    if request.url.path in EXCLUDED_PATHS or request.url.path.startswith("/covers/"):
        return await call_next(request)

    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

    logger.info(
        "%s %s → %s (%.1f ms)",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )

    if response.status_code == 204:
        return response

    # Read body
    body = b""
    async for chunk in response.body_iterator:
        body += chunk

    content_type = response.headers.get("content-type", "")
    response_headers = dict(response.headers)
    response_headers.pop("content-length", None)

    if "application/json" not in content_type:
        return Response(
            content=body,
            status_code=response.status_code,
            headers=response_headers,
            media_type=response.media_type,
        )

    try:
        payload = json.loads(body.decode("utf-8")) if body else None
    except json.JSONDecodeError:
        return Response(
            content=body,
            status_code=response.status_code,
            headers=response_headers,
            media_type=response.media_type,
        )

    # Already wrapped?
    if isinstance(payload, dict) and {"status", "data", "error_message"}.issubset(payload.keys()):
        wrapped = payload
    else:
        error_message = None
        data = payload
        if response.status_code >= 400:
            if isinstance(payload, dict):
                error_message = payload.get("error_message") or payload.get("detail")
            data = None
        wrapped = {"status": response.status_code, "data": data, "error_message": error_message}

    return JSONResponse(
        status_code=response.status_code, content=wrapped, headers=response_headers
    )
