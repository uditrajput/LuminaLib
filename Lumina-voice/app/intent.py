"""Intent classification router for spoken and text queries."""

from __future__ import annotations

import re
import logging

logger = logging.getLogger("lumina_voice.intent")

INTENT_PATTERNS = {
    "borrow": [
        r"\b(borrow|check out|take out|get this book|lend me)\b",
    ],
    "return": [
        r"\b(return|give back|bring back|handed back)\b",
    ],
    "review": [
        r"\b(review|rating|rate|stars|leave a review|my thoughts)\b",
    ],
    "recommend": [
        r"\b(recommend|similar|suggest|what else|like this|next read)\b",
    ],
    "summary": [
        r"\b(summary|summarize|synopsis|overview|what is this book about|tl;?dr)\b",
    ],
    "qa": [
        r"\b(who|what|where|when|why|how|explain|character|plot|theme|chapter|author|setting)\b",
    ],
}


def classify_intent(text: str) -> tuple[str, float, dict]:
    """Classify user intent from text. Returns (intent_name, confidence_score, metadata)."""
    if not text:
        return "general", 0.5, {}

    text_lower = text.lower().strip()

    # Check patterns
    for intent, patterns in INTENT_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, text_lower):
                logger.info("Matched intent '%s' for text: '%s'", intent, text_lower)
                return intent, 0.95, {}

    # Extract review ratings if present (e.g. "4 stars", "five stars")
    rating_match = re.search(r"(\d)\s*star", text_lower)
    if rating_match or "review" in text_lower:
        rating = int(rating_match.group(1)) if rating_match else 5
        return "review", 0.90, {"rating": rating}

    return "general", 0.70, {}
