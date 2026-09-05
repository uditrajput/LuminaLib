"""LLM abstraction interface."""

from __future__ import annotations

from typing import Protocol


class LLMInterface(Protocol):
    """Protocol defining the LLM provider contract."""

    async def summarize(self, content: str) -> str:
        """Generate a summary of the given content."""
        ...

    async def analyze_review(self, content: str) -> str:
        """Analyze reviews and produce a consensus."""
        ...

    async def generate(self, prompt: str, system_prompt: str = "You are a helpful AI study assistant.") -> str:
        """Generate text or JSON response from prompt."""
        ...
