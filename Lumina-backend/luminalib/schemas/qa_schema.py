"""QA and AI schemas."""

from datetime import datetime
from pydantic import BaseModel


class QuestionRequest(BaseModel):
    """Payload for asking a question."""

    question: str


class SourceExcerpt(BaseModel):
    """A snippet from a book used as context."""
    content: str
    book_title: str | None = None


class AnswerResponse(BaseModel):
    """QA answer response."""

    answer: str
    excerpts: list[SourceExcerpt]


class SummaryRequest(BaseModel):
    """Payload for generating a summary."""

    content: str


class ChatMessageRead(BaseModel):
    """Schema for returning a chat message."""

    id: int
    session_id: int
    role: str
    content: str
    excerpts: list[SourceExcerpt] = []
    is_saved: bool = False
    created_at: datetime


class ChatSessionCreate(BaseModel):
    """Payload for creating a chat session."""

    title: str | None = "New Chat"


class ChatSessionUpdate(BaseModel):
    """Payload for renaming a chat session."""

    title: str


class ChatSessionRead(BaseModel):
    """Schema for returning a chat session."""

    id: int
    user_id: int
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    last_message: str | None = None


class ChatSessionDetailRead(ChatSessionRead):
    """Schema for returning a chat session with all messages."""

    messages: list[ChatMessageRead] = []

