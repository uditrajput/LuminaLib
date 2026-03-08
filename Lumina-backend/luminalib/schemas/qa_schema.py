"""QA and AI schemas."""

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
