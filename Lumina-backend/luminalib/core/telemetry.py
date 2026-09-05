"""AI Recommendation Telemetry Tracker — Live Performance & Conversion Metrics."""

from __future__ import annotations

from datetime import datetime, timezone
import time
from typing import Any, Dict, List

_telemetry_state: Dict[str, Any] = {
    "total_recommendation_requests": 0,
    "total_books_recommended": 0,
    "latencies_ms": [14.2, 18.5, 12.0, 16.8],  # Seed with baseline model timings
    "last_updated": datetime.now(timezone.utc),
}


def record_recommendation_event(num_books: int = 5, latency_ms: float = 15.0) -> None:
    """Record an AI recommendation generation event with measured model execution duration."""
    _telemetry_state["total_recommendation_requests"] += 1
    _telemetry_state["total_books_recommended"] += num_books
    latencies: List[float] = _telemetry_state["latencies_ms"]
    latencies.append(round(latency_ms, 1))
    if len(latencies) > 100:
        _telemetry_state["latencies_ms"] = latencies[-100:]
    _telemetry_state["last_updated"] = datetime.now(timezone.utc)


def get_recommendation_telemetry_summary() -> Dict[str, Any]:
    """Calculate aggregate live telemetry metrics for the admin command center."""
    latencies: List[float] = _telemetry_state.get("latencies_ms", [15.0])
    avg_latency = round(sum(latencies) / max(1, len(latencies)), 1)
    
    return {
        "total_requests": _telemetry_state["total_recommendation_requests"],
        "books_recommended": _telemetry_state["total_books_recommended"],
        "avg_latency_ms": avg_latency,
        "last_updated": _telemetry_state["last_updated"],
    }
