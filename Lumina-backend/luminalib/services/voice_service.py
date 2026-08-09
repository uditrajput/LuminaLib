"""Voice service for LuminaLib backend."""

from __future__ import annotations

import logging
from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from luminalib.models.user import User
from luminalib.models.voice_conversation import VoiceConversation
from luminalib.models.voice_turn import VoiceTurn
from luminalib.repositories.voice_repository import VoiceRepository
from luminalib.schemas.voice_schema import KokoroVoiceOption, VoicePreferencesUpdate

import io
import math
import struct
import wave

logger = logging.getLogger("luminalib.services.voice")

KOKORO_VOICES: list[KokoroVoiceOption] = [
    KokoroVoiceOption(code="af_bella", name="Bella (US Female)", language="en-US", gender="female", quality="5/5"),
    KokoroVoiceOption(code="af_sarah", name="Sarah (US Female)", language="en-US", gender="female", quality="4/5"),
    KokoroVoiceOption(code="am_adam", name="Adam (US Male)", language="en-US", gender="male", quality="4/5"),
    KokoroVoiceOption(code="bf_emma", name="Emma (UK Female)", language="en-GB", gender="female", quality="5/5"),
    KokoroVoiceOption(code="bm_george", name="George (UK Male)", language="en-GB", gender="male", quality="4/5"),
]


def generate_fallback_sample_wav(voice: str = "af_bella", sample_rate: int = 24000) -> bytes:
    """Generate a synthetic WAV audio sample for testing voice model audio playback."""
    duration = 2.0
    num_samples = int(sample_rate * duration)
    buf = io.BytesIO()

    base_freq = 200.0 if voice.startswith("af") or voice.startswith("bf") else 140.0

    with wave.open(buf, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        samples = []
        for i in range(num_samples):
            t = i / sample_rate
            env = math.sin(math.pi * (i / num_samples)) ** 0.5
            freq = base_freq + 20.0 * math.sin(2 * math.pi * 1.5 * t)
            val = 0.7 * math.sin(2 * math.pi * freq * t) + 0.3 * math.sin(4 * math.pi * freq * t)
            value = int(8000 * val * env)
            samples.append(struct.pack("<h", max(-32768, min(32767, value))))
        wav_file.writeframes(b"".join(samples))

    return buf.getvalue()


class VoiceService:
    """Manages voice conversations, user voice preferences, and voice catalog."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = VoiceRepository(session)

    async def list_user_conversations(self, user_id: int) -> Sequence[VoiceConversation]:
        """Fetch list of voice conversations for the given user."""
        return await self.repo.get_user_conversations(user_id=user_id)

    async def get_conversation(self, conversation_id: int, user_id: int) -> VoiceConversation:
        """Fetch a specific conversation ensuring ownership."""
        conv = await self.repo.get_by_id(conversation_id)
        if not conv or conv.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Voice conversation not found",
            )
        return conv

    async def delete_conversation(self, conversation_id: int, user_id: int) -> None:
        """Delete a voice conversation and its turns (GDPR right to erasure)."""
        conv = await self.get_conversation(conversation_id, user_id)
        await self.repo.delete(conv.id)

    async def get_voices(self) -> list[KokoroVoiceOption]:
        """Return available Kokoro TTS voice packs."""
        return KOKORO_VOICES

    async def update_user_preferences(self, user: User, prefs: VoicePreferencesUpdate) -> User:
        """Update voice preferences for a user."""
        current_prefs = dict(user.voice_preferences or {})
        current_prefs.update(prefs.model_dump())
        user.voice_preferences = current_prefs
        flag_modified(user, "voice_preferences")
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user
