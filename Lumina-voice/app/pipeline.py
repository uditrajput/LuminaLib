"""Voice Pipeline Orchestrator."""

from __future__ import annotations

import logging
import os
import re
import time
from typing import Any

import httpx

from app.action_executor import (
    clear_pending_action,
    create_pending_action,
    execute_voice_action,
    get_pending_action,
)
from app.intent import classify_intent
from app.security import format_rag_context, sanitize_transcript
from app.stt import transcribe_audio_bytes
from app.tts import synthesize_speech_bytes

logger = logging.getLogger("lumina_voice.pipeline")

LUMINA_API_URL = os.getenv("LUMINA_API_URL", "http://backend:8000/api/v1").rstrip("/")


async def fetch_book_context(book_id: str | None, user_jwt: str) -> dict[str, Any]:
    """Fetch active book context (title, author, summary) from Lumina-backend."""
    if not book_id or not book_id.isdigit():
        return {}

    headers = {"Authorization": f"Bearer {user_jwt}"} if user_jwt else {}
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            resp = await client.get(f"{LUMINA_API_URL}/books/{book_id}", headers=headers)
            if resp.status_code == 200:
                return resp.json().get("data", resp.json())
        except Exception as exc:
            logger.warning("Failed to fetch book context for ID %s: %s", book_id, exc)
    return {}


async def process_user_turn(
    input_type: str,  # 'audio' | 'text' | 'confirm'
    raw_content: bytes | str | dict,
    book_id: str | None,
    user_email: str,
    user_jwt: str,
    voice_pref: str = "af_bella",
    speed_pref: float = 1.0,
) -> dict[str, Any]:
    """Process a single turn in the voice conversation lifecycle.
    Returns dictionary with transcript, intent, action_request/action_result, response_text, audio_bytes, and latency_ms.
    """
    start_time = time.time()

    # 1. Obtain user text input
    if input_type == "audio" and isinstance(raw_content, bytes):
        raw_text = await transcribe_audio_bytes(raw_content)
    elif input_type == "text" and isinstance(raw_content, str):
        raw_text = raw_content
    elif input_type == "confirm" and isinstance(raw_content, dict):
        action_id = raw_content.get("action_id", "")
        confirmed = raw_content.get("confirmed", False)
        
        pending = get_pending_action(action_id, user_email)
        if not pending:
            text = "Sorry, that action request expired or was invalid."
            audio = await synthesize_speech_bytes(text, voice=voice_pref, speed=speed_pref)
            return {
                "transcript": "Confirmation",
                "intent": "action_confirm",
                "response_text": text,
                "audio_bytes": audio,
                "latency_ms": int((time.time() - start_time) * 1000),
            }

        if confirmed:
            res = await execute_voice_action(
                action_type=pending["action_type"],
                book_id=pending["book_id"],
                user_jwt=user_jwt,
                extra_data=pending["extra_data"],
            )
            clear_pending_action(action_id)
            resp_msg = res.get("message", "Action performed successfully.")
            audio = await synthesize_speech_bytes(resp_msg, voice=voice_pref, speed=speed_pref)
            return {
                "transcript": "Confirm action",
                "intent": pending["action_type"],
                "action_result": res,
                "response_text": resp_msg,
                "audio_bytes": audio,
                "latency_ms": int((time.time() - start_time) * 1000),
            }
        else:
            clear_pending_action(action_id)
            text = "Action cancelled."
            audio = await synthesize_speech_bytes(text, voice=voice_pref, speed=speed_pref)
            return {
                "transcript": "Cancel action",
                "intent": "cancel",
                "response_text": text,
                "audio_bytes": audio,
                "latency_ms": int((time.time() - start_time) * 1000),
            }
    else:
        raw_text = str(raw_content)

    # 2. Sanitize input text (CRIT-002)
    sanitized_text = sanitize_transcript(raw_text)
    if not sanitized_text:
        text = "I couldn't hear or understand that clearly. Please try speaking again."
        audio = await synthesize_speech_bytes(text, voice=voice_pref, speed=speed_pref)
        return {
            "transcript": "",
            "intent": "general",
            "response_text": text,
            "audio_bytes": audio,
            "latency_ms": int((time.time() - start_time) * 1000),
        }

    # 3. Classify intent
    intent_name, confidence, intent_meta = classify_intent(sanitized_text)
    book_context = await fetch_book_context(book_id, user_jwt)

    # 4. Handle Actions requiring confirmation (borrow, return, review)
    if intent_name in ("borrow", "return", "review"):
        if not user_jwt:
            text = "Please log in to your LuminaLib account to perform library actions."
            audio = await synthesize_speech_bytes(text, voice=voice_pref, speed=speed_pref)
            return {
                "transcript": sanitized_text,
                "intent": intent_name,
                "response_text": text,
                "audio_bytes": audio,
                "latency_ms": int((time.time() - start_time) * 1000),
            }

        title = book_context.get("title", f"Book #{book_id}" if book_id else "this book")
        action_id = create_pending_action(intent_name, book_id, user_email, extra_data=intent_meta)
        confirm_msg = f"Are you sure you want to {intent_name} '{title}'? Click confirm or say 'confirm' to proceed."
        audio = await synthesize_speech_bytes(confirm_msg, voice=voice_pref, speed=speed_pref)

        return {
            "transcript": sanitized_text,
            "intent": intent_name,
            "action_request": {
                "action_id": action_id,
                "action": intent_name,
                "book_id": book_id,
                "book_title": title,
                "message": confirm_msg,
            },
            "response_text": confirm_msg,
            "audio_bytes": audio,
            "latency_ms": int((time.time() - start_time) * 1000),
        }

    # 5. Handle Summary Intent
    if intent_name == "summary":
        if book_context and book_context.get("title"):
            summary = book_context.get("summary") or book_context.get("description") or f"This book is '{book_context.get('title')}' by {book_context.get('author', 'Unknown Author')}."
            resp_msg = f"Here is a summary of {book_context.get('title')}: {summary}"
        else:
            resp_msg = "LuminaLib is your intelligent digital library service featuring automated book summaries, semantic document Q&A, and personalized ML recommendations."

        audio = await synthesize_speech_bytes(resp_msg, voice=voice_pref, speed=speed_pref)
        return {
            "transcript": sanitized_text,
            "intent": "summary",
            "response_text": resp_msg,
            "audio_bytes": audio,
            "latency_ms": int((time.time() - start_time) * 1000),
        }

    # 6. Handle Recommendation Intent
    if intent_name == "recommend":
        res = await execute_voice_action("recommend", None, user_jwt)
        recs = []
        if res.get("status") == "success":
            raw_data = res.get("data", {})
            items = raw_data.get("data", raw_data) if isinstance(raw_data, dict) else raw_data
            if isinstance(items, list) and len(items) > 0:
                recs = items[:3]

        if recs:
            titles = [f"'{r.get('title')}' by {r.get('author')}" for r in recs if isinstance(r, dict)]
            resp_msg = f"Based on your profile, I recommend: {', '.join(titles)}."
        else:
            resp_msg = "I recommend checking out our top rated books catalog!"

        audio = await synthesize_speech_bytes(resp_msg, voice=voice_pref, speed=speed_pref)
        return {
            "transcript": sanitized_text,
            "intent": "recommend",
            "response_text": resp_msg,
            "audio_bytes": audio,
            "latency_ms": int((time.time() - start_time) * 1000),
        }

    # 7. Handle Greetings & Casual Conversation
    clean_lower = sanitized_text.lower().strip()
    if re.search(r"^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening))\b", clean_lower):
        resp_msg = "Hello! I am your LuminaLib AI assistant. How can I help you with your reading today?"
        audio = await synthesize_speech_bytes(resp_msg, voice=voice_pref, speed=speed_pref)
        return {
            "transcript": sanitized_text,
            "intent": "general",
            "response_text": resp_msg,
            "audio_bytes": audio,
            "latency_ms": int((time.time() - start_time) * 1000),
        }

    if "can you help me" in clean_lower or "what can you do" in clean_lower:
        resp_msg = "Yes, absolutely! I can summarize books, answer questions about library titles, recommend books based on your reading preferences, or assist with borrowing and returning."
        audio = await synthesize_speech_bytes(resp_msg, voice=voice_pref, speed=speed_pref)
        return {
            "transcript": sanitized_text,
            "intent": "general",
            "response_text": resp_msg,
            "audio_bytes": audio,
            "latency_ms": int((time.time() - start_time) * 1000),
        }

    # 8. Handle Q&A Intent (via Lumina-backend RAG and LLM)
    if intent_name in ("qa", "general"):
        target_bid = book_id if (book_id and str(book_id).isdigit()) else None
        res = await execute_voice_action("qa", target_bid, user_jwt, extra_data={"question": sanitized_text})

        if res.get("status") == "success":
            raw_data = res.get("data", {})
            qa_dict = raw_data.get("data", raw_data) if isinstance(raw_data, dict) else raw_data
            answer = qa_dict.get("answer") if isinstance(qa_dict, dict) else str(qa_dict)
            if answer and answer.strip():
                audio = await synthesize_speech_bytes(answer, voice=voice_pref, speed=speed_pref)
                return {
                    "transcript": sanitized_text,
                    "intent": "qa",
                    "response_text": answer,
                    "audio_bytes": audio,
                    "latency_ms": int((time.time() - start_time) * 1000),
                }

        # Handle specific backend feedback if borrow is required for RAG
        err_msg = res.get("message", "")
        if "must first borrow at least one book" in err_msg.lower():
            resp_msg = "To ask AI questions about specific books, please borrow at least one book from the library first! In the meantime, feel free to ask me for recommendations or summaries."
            audio = await synthesize_speech_bytes(resp_msg, voice=voice_pref, speed=speed_pref)
            return {
                "transcript": sanitized_text,
                "intent": "qa",
                "response_text": resp_msg,
                "audio_bytes": audio,
                "latency_ms": int((time.time() - start_time) * 1000),
            }

        # Fallback conversational response if API is unauthenticated or unavailable
        title = book_context.get("title") if book_context else None
        if title:
            resp_msg = f"Regarding '{title}': You can ask me for a summary, ask questions about its content, or ask to borrow, return, or review it."
        else:
            resp_msg = "I am your LuminaLib voice assistant. You can ask me questions about any book, ask for recommendations, or manage your borrows and reviews."

        audio = await synthesize_speech_bytes(resp_msg, voice=voice_pref, speed=speed_pref)
        return {
            "transcript": sanitized_text,
            "intent": "general",
            "response_text": resp_msg,
            "audio_bytes": audio,
            "latency_ms": int((time.time() - start_time) * 1000),
        }

    title = book_context.get("title") if book_context else "the library catalog"
    resp_msg = f"I've received your query about {title}. How else can I help you today?"
    audio = await synthesize_speech_bytes(resp_msg, voice=voice_pref, speed=speed_pref)
    return {
        "transcript": sanitized_text,
        "intent": intent_name,
        "response_text": resp_msg,
        "audio_bytes": audio,
        "latency_ms": int((time.time() - start_time) * 1000),
    }
