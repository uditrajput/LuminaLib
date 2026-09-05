"""Real-time User Presence & Live Session Tracker."""

from __future__ import annotations

from datetime import datetime, timezone
import time
from typing import Any, Dict, List

# In-memory presence registry
# Key: user_id -> dict with session metadata
_active_sessions: Dict[int, Dict[str, Any]] = {}

SESSION_TIMEOUT_SECONDS = 900  # 15 minutes idle timeout


def record_user_activity(
    user_id: int,
    email: str,
    full_name: str | None = None,
    user_agent: str = "Web Browser",
    ip_address: str | None = None,
) -> None:
    """Record or refresh active live presence for an authenticated user."""
    now = datetime.now(timezone.utc)
    login_time = _active_sessions.get(user_id, {}).get("login_time") or now

    _active_sessions[user_id] = {
        "user_id": user_id,
        "email": email,
        "full_name": full_name or email.split("@")[0],
        "device": _format_device(user_agent),
        "ip": ip_address or "127.0.0.1",
        "login_time": login_time,
        "last_activity_ts": time.time(),
        "last_activity": now,
    }


def remove_user_activity(user_id: int) -> None:
    """Explicitly remove user presence on logout."""
    _active_sessions.pop(user_id, None)


def get_active_online_users() -> List[Dict[str, Any]]:
    """Return all currently live online users who have not timed out or logged out."""
    now_ts = time.time()
    online: List[Dict[str, Any]] = []

    for user_id, data in list(_active_sessions.items()):
        elapsed = now_ts - data.get("last_activity_ts", 0)
        if elapsed <= SESSION_TIMEOUT_SECONDS:
            login_time_dt = data["login_time"]
            login_str = login_time_dt.strftime("%I:%M %p")
            duration_mins = max(1, int((now_ts - login_time_dt.timestamp()) / 60))

            online.append({
                "user_id": user_id,
                "full_name": data["full_name"],
                "email": data["email"],
                "device": data["device"],
                "login_time": login_str,
                "last_activity": f"{int(elapsed)}s ago" if elapsed < 60 else f"{int(elapsed // 60)}m ago",
                "session_duration": f"{duration_mins} min",
            })
        else:
            # Idle timeout cleanup
            _active_sessions.pop(user_id, None)

    return online


def _format_device(user_agent: str) -> str:
    ua = user_agent.lower()
    if "firefox" in ua:
        browser = "Firefox"
    elif "chrome" in ua or "chromium" in ua:
        browser = "Chrome"
    elif "safari" in ua:
        browser = "Safari"
    elif "edge" in ua or "edg" in ua:
        browser = "Edge"
    else:
        browser = "Web Browser"

    if "windows" in ua:
        os = "Windows"
    elif "mac" in ua:
        os = "macOS"
    elif "android" in ua:
        os = "Android"
    elif "iphone" in ua or "ipad" in ua:
        os = "iOS"
    elif "linux" in ua:
        os = "Linux"
    else:
        os = "Desktop"

    return f"{browser} ({os})"
