"""Mock LLM provider for development and testing."""

from __future__ import annotations

import logging

logger = logging.getLogger("luminalib.llm.mock")


class MockProvider:
    """Returns deterministic mock responses — no external API calls."""

    async def summarize(self, content: str) -> str:
        snippet = content.strip().replace("\n", " ")[:240]
        logger.debug("Mock summarize called (content length=%d)", len(content))
        return f"Summary: {snippet}"

    async def analyze_review(self, content: str) -> str:
        snippet = content.strip().replace("\n", " ")[:240]
        logger.debug("Mock analyze_review called (content length=%d)", len(content))
        return f"Consensus: {snippet}"
