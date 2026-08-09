"""Voice Conversation & Turn repository."""

from __future__ import annotations

from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from luminalib.models.voice_conversation import VoiceConversation
from luminalib.models.voice_turn import VoiceTurn
from luminalib.repositories.base_repository import BaseRepository


class VoiceRepository(BaseRepository[VoiceConversation]):
    """Voice conversation and turn data access."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(VoiceConversation, session)

    async def get_user_conversations(self, user_id: int, limit: int = 50) -> Sequence[VoiceConversation]:
        """Fetch conversations for a given user ordered by start time."""
        stmt = (
            select(VoiceConversation)
            .where(VoiceConversation.user_id == user_id)
            .options(selectinload(VoiceConversation.turns))
            .order_by(VoiceConversation.started_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_session_id(self, session_id: str) -> VoiceConversation | None:
        """Fetch conversation by session_id."""
        stmt = (
            select(VoiceConversation)
            .where(VoiceConversation.session_id == session_id)
            .options(selectinload(VoiceConversation.turns))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def add_turn(
        self,
        conversation_id: int,
        turn_number: int,
        speaker: str,
        text: str,
        audio_url: str | None = None,
        intent: str | None = None,
        action_taken: dict | None = None,
        latency_ms: int | None = None,
    ) -> VoiceTurn:
        """Create and persist a new conversation turn."""
        turn = VoiceTurn(
            conversation_id=conversation_id,
            turn_number=turn_number,
            speaker=speaker,
            text=text,
            audio_url=audio_url,
            intent=intent,
            action_taken=action_taken,
            latency_ms=latency_ms,
            created_by="system",
            updated_by="system",
        )
        self.session.add(turn)
        await self.session.commit()
        await self.session.refresh(turn)
        return turn
