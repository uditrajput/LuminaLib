"""Unit tests for Lumina-voice microservice."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.security import (
    decode_jwt_token,
    extract_token_from_subprotocol,
    sanitize_transcript,
    validate_origin,
)
from app.intent import classify_intent


def test_subprotocol_token_extraction():
    header = "voice-v1, jwt-eyJhbGciOiJIUzI1NiJ9.test"
    selected, token = extract_token_from_subprotocol(header)
    assert selected == "voice-v1"
    assert token == "eyJhbGciOiJIUzI1NiJ9.test"


def test_sanitize_transcript():
    raw = "Show me books <script>alert(1)</script>"
    clean = sanitize_transcript(raw)
    assert "<script>" not in clean
    assert clean == "Show me books alert(1)"


def test_intent_classification():
    intent, conf, meta = classify_intent("I want to borrow this book")
    assert intent == "borrow"

    intent_summary, _, _ = classify_intent("Give me a summary of chapter 1")
    assert intent_summary == "summary"

    intent_rec, _, _ = classify_intent("Recommend me something similar")
    assert intent_rec == "recommend"


def test_validate_origin():
    assert validate_origin("http://localhost:3000") is True
    assert validate_origin("http://malicious.site") is False


import pytest
from app.pipeline import process_user_turn


@pytest.mark.asyncio
async def test_process_user_turn_text():
    res = await process_user_turn(
        input_type="text",
        raw_content="Hi, What's the author name of Complete Reference book?",
        book_id="general",
        user_email="test@luminalib.local",
        user_jwt="",
    )
    assert "response_text" in res
    assert res["response_text"] != ""
    assert res["intent"] in ("qa", "general")
    assert "audio_bytes" in res
    assert isinstance(res["audio_bytes"], bytes)


from app.tts import is_devanagari_text, synthesize_speech_bytes


def test_devanagari_detection():
    assert is_devanagari_text("नमस्ते भारत") is True
    assert is_devanagari_text("Hello LuminaLib") is False
    assert is_devanagari_text("श्रीमद्भगवद्गीता Chapter 1") is True


@pytest.mark.asyncio
async def test_synthesize_speech_and_cache():
    text = "Unit test text for high speed neural speech synthesis."
    audio_bytes1, media_type1 = await synthesize_speech_bytes(text, voice="af_bella", speed=1.0)
    assert isinstance(audio_bytes1, bytes)
    assert len(audio_bytes1) > 0
    assert media_type1 in ("audio/mpeg", "audio/wav")

    # Second call should hit the in-memory LRU cache
    audio_bytes2, media_type2 = await synthesize_speech_bytes(text, voice="af_bella", speed=1.0)
    assert audio_bytes1 == audio_bytes2
    assert media_type1 == media_type2
