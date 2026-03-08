"""Review analysis service — builds corpus and delegates to LLM."""

from __future__ import annotations

from luminalib.interfaces.llm_interface import LLMInterface


def build_review_corpus(reviews: list[str]) -> str:
    """Combine review texts into a single corpus."""
    return "\n".join(reviews)


async def generate_review_summary(reviews: list[str], llm: LLMInterface) -> str:
    """Generate a rolling review consensus using the configured LLM."""
    if not reviews:
        return ""
    corpus = build_review_corpus(reviews)
    return await llm.analyze_review(corpus)
