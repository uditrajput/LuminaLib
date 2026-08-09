"""Action executor for voice commands against LuminaLib REST APIs."""

from __future__ import annotations

import os
import uuid
import time
import logging
from typing import Any

import httpx

logger = logging.getLogger("lumina_voice.action_executor")

LUMINA_API_URL = os.getenv("LUMINA_API_URL", "http://backend:8000/api/v1").rstrip("/")

# Pending voice actions store: action_id -> { action_type, book_id, user_email, extra_data, expires_at }
_pending_actions: dict[str, dict[str, Any]] = {}

ALLOWED_ACTION_ENDPOINTS = {
    "borrow": "/books/{book_id}/borrow",
    "return": "/books/{book_id}/return",
    "review": "/books/{book_id}/reviews",
    "recommend": "/recommendations",
    "qa": "/qa",
}


def create_pending_action(action_type: str, book_id: str | None, user_email: str, extra_data: dict | None = None) -> str:
    """Create a pending action requiring confirmation with a 30-second TTL (MED-007)."""
    action_id = f"{action_type}_{uuid.uuid4().hex[:8]}"
    _pending_actions[action_id] = {
        "action_type": action_type,
        "book_id": book_id,
        "user_email": user_email,
        "extra_data": extra_data or {},
        "expires_at": time.time() + 30.0,
    }
    return action_id


def get_pending_action(action_id: str, user_email: str) -> dict[str, Any] | None:
    """Fetch and validate a pending action for a user."""
    action = _pending_actions.get(action_id)
    if not action:
        return None
    if time.time() > action["expires_at"]:
        _pending_actions.pop(action_id, None)
        return None
    if action["user_email"] != user_email:
        logger.warning("User '%s' attempted to confirm action belonging to '%s'", user_email, action["user_email"])
        return None
    return action


def clear_pending_action(action_id: str) -> None:
    _pending_actions.pop(action_id, None)


async def execute_voice_action(
    action_type: str,
    book_id: str | None,
    user_jwt: str,
    extra_data: dict | None = None,
) -> dict[str, Any]:
    """Execute an authenticated REST API call on behalf of the user using their JWT (CRIT-003)."""
    if action_type not in ALLOWED_ACTION_ENDPOINTS:
        return {"status": "error", "message": f"Action '{action_type}' is not allowed."}

    headers = {
        "Authorization": f"Bearer {user_jwt}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            if action_type == "borrow":
                if not book_id:
                    return {"status": "error", "message": "Please select a book first."}
                url = f"{LUMINA_API_URL}/books/{book_id}/borrow"
                resp = await client.post(url, headers=headers)

            elif action_type == "return":
                if not book_id:
                    return {"status": "error", "message": "Please select a book first."}
                url = f"{LUMINA_API_URL}/books/{book_id}/return"
                resp = await client.post(url, headers=headers)

            elif action_type == "review":
                if not book_id:
                    return {"status": "error", "message": "Please select a book first."}
                url = f"{LUMINA_API_URL}/books/{book_id}/reviews"
                payload = {
                    "rating": extra_data.get("rating", 5) if extra_data else 5,
                    "comment": extra_data.get("comment", "Submitted via voice assistant.") if extra_data else "Submitted via voice assistant.",
                }
                resp = await client.post(url, headers=headers, json=payload)

            elif action_type == "recommend":
                url = f"{LUMINA_API_URL}/recommendations"
                resp = await client.get(url, headers=headers)

            elif action_type == "qa":
                url = f"{LUMINA_API_URL}/qa"
                payload = {
                    "question": extra_data.get("question", ""),
                    "book_id": int(book_id) if book_id and book_id.isdigit() else None,
                }
                resp = await client.post(url, headers=headers, json=payload)
            else:
                return {"status": "error", "message": "Unknown action"}

            if resp.status_code in (200, 201):
                data = resp.json()
                return {"status": "success", "data": data, "message": f"{action_type.capitalize()} completed successfully."}
            else:
                detail = "Action failed"
                try:
                    res = resp.json()
                    detail = res.get("detail", res.get("message", detail))
                except Exception:
                    pass
                return {"status": "error", "message": f"{detail} (HTTP {resp.status_code})"}

        except Exception as exc:
            logger.error("Failed to execute action %s: %s", action_type, exc)
            return {"status": "error", "message": f"Connection failure: {str(exc)}"}
