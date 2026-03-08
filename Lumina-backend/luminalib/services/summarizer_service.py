"""Summarizer service — delegates to LLM provider."""

from __future__ import annotations

from luminalib.interfaces.llm_interface import LLMInterface


async def generate_summary(text: str, llm: LLMInterface) -> str:
    """Generate a book summary using the configured LLM."""
    if not text.strip():
        return ""
    return await llm.summarize(text)
