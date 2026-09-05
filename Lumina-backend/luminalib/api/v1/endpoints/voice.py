"""Voice assistant REST API endpoints."""

from __future__ import annotations

from typing import Sequence

from fastapi import APIRouter, Depends, status

from luminalib.api.v1.deps import get_current_user, get_voice_service
from luminalib.models.user import User
from luminalib.schemas.voice_schema import (
    KokoroVoiceOption,
    TTSGenerateRequest,
    VoiceConversationRead,
    VoicePreferencesRead,
    VoicePreferencesUpdate,
)
from luminalib.services.voice_service import VoiceService

router = APIRouter(prefix="/voice", tags=["voice"])


@router.get("/conversations", response_model=list[VoiceConversationRead], summary="List user voice conversations")
async def list_conversations(
    current_user: User = Depends(get_current_user),
    voice_service: VoiceService = Depends(get_voice_service),
) -> Sequence[VoiceConversationRead]:
    """Fetch all voice conversations for the logged-in user."""
    return await voice_service.list_user_conversations(user_id=current_user.id)


@router.get(
    "/conversations/{conversation_id}",
    response_model=VoiceConversationRead,
    summary="Get voice conversation details & turns",
)
async def get_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    voice_service: VoiceService = Depends(get_voice_service),
) -> VoiceConversationRead:
    """Fetch details and transcript turns for a specific voice conversation."""
    return await voice_service.get_conversation(conversation_id=conversation_id, user_id=current_user.id)


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete voice conversation history",
)
async def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    voice_service: VoiceService = Depends(get_voice_service),
) -> None:
    """Delete a voice conversation session (GDPR compliance)."""
    await voice_service.delete_conversation(conversation_id=conversation_id, user_id=current_user.id)


@router.get("/voices", response_model=list[KokoroVoiceOption], summary="List available Kokoro TTS voices")
async def list_voices(
    voice_service: VoiceService = Depends(get_voice_service),
) -> list[KokoroVoiceOption]:
    """List available Kokoro TTS voice packs."""
    return await voice_service.get_voices()


@router.get("/preferences", response_model=VoicePreferencesRead, summary="Get user voice preferences")
async def get_preferences(
    current_user: User = Depends(get_current_user),
) -> VoicePreferencesRead:
    """Get the current user's voice assistant preferences."""
    prefs = current_user.voice_preferences or {
        "voice": "af_bella",
        "speed": 1.0,
        "language": "a",
        "auto_play": True,
        "show_transcript": True,
    }
    return VoicePreferencesRead(**prefs)


@router.put("/preferences", response_model=VoicePreferencesRead, summary="Update user voice preferences")
async def update_preferences(
    payload: VoicePreferencesUpdate,
    current_user: User = Depends(get_current_user),
    voice_service: VoiceService = Depends(get_voice_service),
) -> VoicePreferencesRead:
    """Update voice preferences for the current user."""
    updated_user = await voice_service.update_user_preferences(user=current_user, prefs=payload)
    return VoicePreferencesRead(**(updated_user.voice_preferences or {}))


import os
import logging
import httpx
from fastapi import Response, UploadFile, File

VOICE_SERVICE_URL = os.getenv("VOICE_SERVICE_URL", "http://voice:8001").rstrip("/")
logger = logging.getLogger("luminalib.api.voice")


@router.get("/sample", summary="Listen to Kokoro voice model audio sample")
async def get_voice_sample(voice: str = "af_bella", speed: float = 1.0, text: str | None = None):
    """Proxy voice audio sample generation to voice microservice."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{VOICE_SERVICE_URL}/voice/sample",
                params={"voice": voice, "speed": speed, "text": text},
            )
            if resp.status_code == 200:
                media_type = resp.headers.get("content-type", "audio/wav")
                return Response(content=resp.content, media_type=media_type)
    except Exception as exc:
        logger.warning("Voice service sample proxy failed: %s", exc)

    from luminalib.services.voice_service import generate_fallback_sample_wav
    return Response(content=generate_fallback_sample_wav(voice), media_type="audio/wav")


@router.get("/tts", summary="Generate TTS speech audio from query parameters")
async def get_voice_tts_proxy(text: str, voice: str = "af_bella", speed: float = 1.0):
    """Proxy text-to-speech audio synthesis (Hindi/Sanskrit/English) to voice microservice."""
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(
                f"{VOICE_SERVICE_URL}/voice/tts",
                params={"text": text, "voice": voice, "speed": speed},
            )
            if resp.status_code == 200:
                media_type = resp.headers.get("content-type", "audio/mpeg")
                return Response(content=resp.content, media_type=media_type)
    except Exception as exc:
        logger.warning("Voice service TTS proxy failed: %s", exc)

    from luminalib.services.voice_service import generate_fallback_sample_wav
    return Response(content=generate_fallback_sample_wav(voice), media_type="audio/wav")


@router.post("/tts", summary="Generate TTS speech audio from payload")
async def post_voice_tts_proxy(payload: TTSGenerateRequest):
    """Proxy text-to-speech audio synthesis from POST payload."""
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{VOICE_SERVICE_URL}/voice/tts",
                json={"text": payload.text, "voice": payload.voice, "speed": payload.speed},
            )
            if resp.status_code == 200:
                media_type = resp.headers.get("content-type", "audio/mpeg")
                return Response(content=resp.content, media_type=media_type)
    except Exception as exc:
        logger.warning("Voice service TTS proxy failed: %s", exc)

    from luminalib.services.voice_service import generate_fallback_sample_wav
    return Response(content=generate_fallback_sample_wav(payload.voice or "af_bella"), media_type="audio/wav")


@router.post("/transcribe", summary="Transcribe recorded audio (STT)")
async def transcribe_audio_proxy(file: UploadFile = File(...)):
    """Proxy audio blob transcription to voice microservice (Whisper STT)."""
    try:
        content = await file.read()
        async with httpx.AsyncClient(timeout=30.0) as client:
            files = {"file": (file.filename or "recording.webm", content, file.content_type or "audio/webm")}
            resp = await client.post(f"{VOICE_SERVICE_URL}/voice/transcribe", files=files)
            if resp.status_code == 200:
                return resp.json()
    except Exception as exc:
        logger.warning("Voice service transcribe proxy failed: %s", exc)
    return {"transcript": ""}

