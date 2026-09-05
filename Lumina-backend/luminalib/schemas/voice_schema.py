"""Voice assistant schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class VoiceTurnRead(BaseModel):
    """Voice conversation turn schema."""

    id: int
    conversation_id: int
    turn_number: int
    speaker: str
    text: str
    audio_url: str | None = None
    intent: str | None = None
    action_taken: dict[str, Any] | None = None
    latency_ms: int | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class VoiceConversationRead(BaseModel):
    """Voice conversation session schema."""

    id: int
    session_id: str
    user_id: int
    book_id: int | None = None
    started_at: datetime
    ended_at: datetime | None = None
    status: str
    metadata_json: dict[str, Any] | None = None
    turns: list[VoiceTurnRead] = []

    model_config = ConfigDict(from_attributes=True)


class VoicePreferencesUpdate(BaseModel):
    """User voice preferences payload."""

    voice: str = Field(default="af_bella")
    speed: float = Field(default=1.0, ge=0.5, le=2.0)
    language: str = Field(default="a")
    auto_play: bool = Field(default=True)
    show_transcript: bool = Field(default=True)


class VoicePreferencesRead(VoicePreferencesUpdate):
    """User voice preferences response."""

    pass


class KokoroVoiceOption(BaseModel):
    """Kokoro voice option metadata."""

    code: str
    name: str
    language: str
    gender: str
    quality: str


class TTSGenerateRequest(BaseModel):
    """TTS generation request payload."""

    text: str = Field(min_length=1, max_length=10000)
    voice: str = Field(default="af_bella")
    speed: float = Field(default=1.0, ge=0.5, le=2.0)
