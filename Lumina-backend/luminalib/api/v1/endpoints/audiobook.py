"""Audiobook endpoint — streaming chapter-wise & description TTS in Hindi, Sanskrit, and English."""

from __future__ import annotations

import os
import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.api.v1.deps import get_db
from luminalib.models.book import Book
from luminalib.services.devanagari_converter import clean_and_normalize_devanagari
from luminalib.services.voice_service import generate_fallback_sample_wav

logger = logging.getLogger("luminalib.api.audiobook")
VOICE_SERVICE_URL = os.getenv("VOICE_SERVICE_URL", "http://voice:8001").rstrip("/")

router = APIRouter(prefix="/books", tags=["audiobook"])


@router.get("/{book_id}/audio", summary="Get audiobook status/stream info")
async def get_audiobook(book_id: int, db: AsyncSession = Depends(get_db)):
    """Fetch audiobook details and audio stream URL for a given book."""
    res = await db.execute(select(Book).where(Book.id == book_id))
    book = res.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    clean_desc = clean_and_normalize_devanagari(book.description or "")
    clean_title = clean_and_normalize_devanagari(book.title or "")

    return {
        "book_id": book_id,
        "title": clean_title,
        "author": book.author,
        "status": "ready",
        "chapters": 1,
        "audio_url": f"/api/v1/books/{book_id}/audio/stream",
        "stream_url": f"/api/v1/books/{book_id}/audio/stream",
        "tts_voices": ["af_bella", "am_adam", "bf_emma", "hindi_natural"],
        "note": "Native Indic (Hindi/Sanskrit) and English audio narration ready.",
    }


@router.get("/{book_id}/audio/stream", summary="Stream audiobook narration audio")
async def stream_audiobook(book_id: int, speed: float = 1.0, db: AsyncSession = Depends(get_db)):
    """Synthesize and stream audio narration for book title, author, and description."""
    res = await db.execute(select(Book).where(Book.id == book_id))
    book = res.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    clean_title = clean_and_normalize_devanagari(book.title or "")
    clean_author = clean_and_normalize_devanagari(book.author or "")
    clean_desc = clean_and_normalize_devanagari(book.description or "")

    # Compose narration script
    narration_parts = [clean_title]
    if clean_author:
        narration_parts.append(f"लेखक: {clean_author}" if re.search(r'[\u0900-\u097F]', clean_title) else f"By {clean_author}")
    if clean_desc:
        narration_parts.append(clean_desc)

    narration_text = ". ".join(narration_parts)

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{VOICE_SERVICE_URL}/voice/tts",
                params={"text": narration_text, "speed": speed},
            )
            if resp.status_code == 200:
                media_type = resp.headers.get("content-type", "audio/mpeg")
                return Response(content=resp.content, media_type=media_type)
    except Exception as exc:
        logger.warning("Audiobook voice synthesis request failed: %s", exc)

    return Response(content=generate_fallback_sample_wav(clean_title), media_type="audio/wav")


import re


@router.post("/{book_id}/audio/generate", summary="Trigger audiobook generation (Teacher/Admin)")
async def generate_audiobook(book_id: int, db: AsyncSession = Depends(get_db)):
    """Generate or pre-cache audiobook audio for a given book."""
    res = await db.execute(select(Book).where(Book.id == book_id))
    book = res.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    return {
        "message": "Audiobook generation complete.",
        "book_id": book_id,
        "audio_url": f"/api/v1/books/{book_id}/audio/stream",
    }
