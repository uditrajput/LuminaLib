"""Voice Turn model for storing individual turns in a voice conversation."""

from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from luminalib.models.base_audit_model import AuditBase


class VoiceTurn(AuditBase):
    """Represents a single utterance turn (user or assistant) in a voice session."""

    __tablename__ = "voice_turns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("voice_conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    turn_number: Mapped[int] = mapped_column(Integer, nullable=False)
    speaker: Mapped[str] = mapped_column(String(10), nullable=False)  # 'user' | 'assistant'
    text: Mapped[str] = mapped_column(Text, nullable=False)
    audio_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    intent: Mapped[str | None] = mapped_column(String(50), nullable=True)
    action_taken: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    conversation: Mapped["VoiceConversation"] = relationship("VoiceConversation", back_populates="turns")
