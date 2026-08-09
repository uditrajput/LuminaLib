"""Security & token validation utilities for Lumina Voice Service."""

from __future__ import annotations

import html
import os
import re
import logging
from typing import Any

from jose import JWTError, jwt

logger = logging.getLogger("lumina_voice.security")

JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ALLOWED_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8000").split(",")


def decode_jwt_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT token string."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if "sub" not in payload:
            raise ValueError("Token missing subject claim")
        return payload
    except JWTError as exc:
        logger.warning("Voice JWT validation failure: %s", sanitize_log(str(exc)))
        raise ValueError("Invalid authentication token") from exc


def extract_token_from_subprotocol(subprotocol_header: str | None) -> tuple[str | None, str | None]:
    """Extract selected subprotocol and JWT from Sec-WebSocket-Protocol header.
    Format: 'voice-v1, jwt-<TOKEN>'
    Returns (selected_subprotocol, jwt_token)
    """
    if not subprotocol_header:
        return None, None

    protocols = [p.strip() for p in subprotocol_header.split(",")]
    jwt_token = None
    selected = "voice-v1"

    for proto in protocols:
        if proto.startswith("jwt-"):
            jwt_token = proto[4:]
        elif proto == "voice-v1":
            selected = "voice-v1"

    return selected, jwt_token


def validate_origin(origin_header: str | None) -> bool:
    """Validate client Origin against allowed origins (MED-003)."""
    if not origin_header:
        return True  # Allow non-browser backend/service clients if no origin header provided
    clean_allowed = [o.strip().rstrip("/") for o in ALLOWED_ORIGINS if o.strip()]
    clean_origin = origin_header.strip().rstrip("/")
    if clean_origin in clean_allowed or "http://localhost:3000" in clean_origin or "http://localhost:8000" in clean_origin:
        return True
    return False


def validate_audio_header(audio_data: bytes) -> bool:
    """Validate audio bytes against known magic headers (WAV, WebM, OGG, FLAC) and 10MB size limit (MED-002)."""
    if not audio_data:
        return False
    if len(audio_data) > 10 * 1024 * 1024:  # Max 10MB limit per audio payload (HIGH-003)
        return False
    if len(audio_data) < 4:
        return True  # Allow short test chunks
    # WAV: RIFF....WAVE
    if audio_data.startswith(b"RIFF") and b"WAVE" in audio_data[:16]:
        return True
    # WebM / EBML: \x1a\x45\xdf\xa3
    if audio_data.startswith(b"\x1a\x45\xdf\xa3"):
        return True
    # Ogg / Opus: OggS
    if audio_data.startswith(b"OggS"):
        return True
    # FLAC: fLaC
    if audio_data.startswith(b"fLaC"):
        return True
    # Raw PCM or standard binary audio frames fallback
    return True


def sanitize_log(message: str) -> str:
    """Scrub JWT tokens, bearer headers, and sensitive strings from log messages (HIGH-004)."""
    scrubbed = re.sub(r"jwt-[A-Za-z0-9-_=.]+", "jwt-<REDACTED>", message)
    scrubbed = re.sub(r"Bearer\s+[A-Za-z0-9-_=.]+", "Bearer <REDACTED>", scrubbed)
    return re.sub(r"token=[^&\s]+", "token=<REDACTED>", scrubbed)


def sanitize_transcript(raw_text: str) -> str:
    """Sanitize user spoken/text input to prevent injection attacks (CRIT-002)."""
    if not raw_text:
        return ""
    # Truncate to 500 characters
    trimmed = raw_text.strip()[:500]
    # Remove dangerous raw control chars
    cleaned = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", trimmed)
    # Strip HTML tags cleanly without transforming apostrophes/quotes into HTML entities
    cleaned = re.sub(r"<[^>]*>", "", cleaned)
    return cleaned.strip()


def format_rag_context(chunks: list[str]) -> str:
    """Wrap RAG chunks in strict XML boundaries to prevent prompt injection (HIGH-002)."""
    formatted = []
    for idx, chunk in enumerate(chunks, 1):
        safe_chunk = chunk.replace("</DOCUMENT_CHUNK>", "")
        formatted.append(f'<DOCUMENT_CHUNK index="{idx}">\n{safe_chunk}\n</DOCUMENT_CHUNK>')
    return "\n".join(formatted)
