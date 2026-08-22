"""Lumina Voice Assistant — FastAPI + WebSocket Entry Point."""

from __future__ import annotations

import json
import os
import logging
import uuid
import asyncio
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from starlette.websockets import WebSocketState

from app.pipeline import process_user_turn
from app.security import (
    decode_jwt_token,
    extract_token_from_subprotocol,
    sanitize_log,
    validate_origin,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("lumina_voice")

app = FastAPI(
    title="LuminaLib Voice Service",
    description="Real-time Voice AI microservice for LuminaLib (STT -> LLM -> Kokoro TTS)",
    version="2.0.0",
)

allowed_origins_env = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8000").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins_env if allowed_origins_env else ["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request, call_next):
    """Inject security headers on all HTTP responses (LOW-002)."""
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "microphone=(self), camera=()"
    response.headers["Server"] = "LuminaLib Voice"
    return response

# Active connections manager: user_email -> set of WebSocket instances
_active_user_connections: dict[str, set[WebSocket]] = {}
_connection_lock = asyncio.Lock()


@app.on_event("startup")
async def startup_event():
    """Pre-warm STT and TTS models asynchronously on container startup."""
    logger.info("Pre-warming STT (Whisper) and TTS (Kokoro) models...")
    loop = asyncio.get_running_loop()
    from app.stt import get_whisper_model
    from app.tts import get_kokoro_pipeline
    await loop.run_in_executor(None, get_whisper_model)
    await loop.run_in_executor(None, get_kokoro_pipeline)
    logger.info("STT and TTS models initialized and ready!")


from fastapi import Response


@app.get("/health", summary="Health check endpoint")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/voice/sample", summary="Generate voice audio sample")
async def get_voice_sample(voice: str = "af_bella", speed: float = 1.0, text: str | None = None):
    """Synthesize a short audio WAV sample for testing voice models."""
    from app.tts import synthesize_speech_bytes
    sample_text = text or f"Hello! This is a test of the {voice} voice model in LuminaLib."
    audio_bytes = await synthesize_speech_bytes(sample_text, voice=voice, speed=speed)
    return Response(content=audio_bytes, media_type="audio/wav")


from fastapi import UploadFile, File

@app.post("/voice/transcribe", summary="Transcribe recorded audio file to text (STT)")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe raw audio bytes (WebM/WAV/Ogg/Opus) into text string."""
    from app.stt import transcribe_audio_bytes
    audio_bytes = await file.read()
    transcript = await transcribe_audio_bytes(audio_bytes)
    return {"transcript": transcript}


@app.websocket("/voice/ws/{book_id}")
async def voice_websocket_endpoint(websocket: WebSocket, book_id: str):
    """WebSocket endpoint for real-time bi-directional streaming audio & text conversations.
    Security: Sec-WebSocket-Protocol header authentication (CRIT-001).
    """
    origin = websocket.headers.get("origin")
    if not validate_origin(origin):
        logger.warning("CORS rejection for WebSocket connection attempt from origin: %s", sanitize_log(str(origin)))
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Extract subprotocol and JWT
    subprotocol_header = websocket.headers.get("sec-websocket-protocol")
    selected_subprotocol, jwt_token = extract_token_from_subprotocol(subprotocol_header)

    user_email = "anonymous@luminalib.local"
    user_jwt = ""

    if jwt_token:
        try:
            payload = decode_jwt_token(jwt_token)
            user_email = payload.get("sub", user_email)
            user_jwt = jwt_token
        except ValueError as exc:
            logger.warning("Unauthorized WebSocket connection attempt: %s", sanitize_log(str(exc)))
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    # Connection limit per user (Max 3 concurrent connections - HIGH-003)
    async with _connection_lock:
        user_conns = _active_user_connections.setdefault(user_email, set())
        if len(user_conns) >= 3:
            logger.warning("Connection limit reached for user %s", user_email)
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    # Accept connection with selected subprotocol
    subprotocol_to_accept = selected_subprotocol if selected_subprotocol else None
    await websocket.accept(subprotocol=subprotocol_to_accept)

    async with _connection_lock:
        _active_user_connections.setdefault(user_email, set()).add(websocket)

    session_id = f"sess_{uuid.uuid4().hex[:12]}"
    logger.info("Voice session started: %s for user: %s (Book ID: %s)", session_id, user_email, book_id)

    try:
        while True:
            # Receive message (binary audio or JSON text)
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                break

            bytes_data = message.get("bytes")
            text_data = message.get("text")

            input_type = "text"
            raw_content: Any = ""

            if bytes_data:
                from app.security import validate_audio_header
                if not validate_audio_header(bytes_data):
                    logger.warning("Rejected invalid or oversized audio payload (len %d bytes)", len(bytes_data))
                    await websocket.send_json({"type": "error", "message": "Invalid audio format or oversized audio payload."})
                    continue
                input_type = "audio"
                raw_content = bytes_data
            elif text_data:
                try:
                    payload = json.loads(text_data)
                    msg_type = payload.get("type")
                    if msg_type == "text":
                        input_type = "text"
                        raw_content = payload.get("content", "")
                    elif msg_type == "confirm":
                        input_type = "confirm"
                        raw_content = payload
                    else:
                        input_type = "text"
                        raw_content = payload.get("content", str(text_data))
                except Exception:
                    input_type = "text"
                    raw_content = text_data

            # Process turn through pipeline
            turn_result = await process_user_turn(
                input_type=input_type,
                raw_content=raw_content,
                book_id=book_id if book_id != "general" else None,
                user_email=user_email,
                user_jwt=user_jwt,
            )

            # Send interim/final transcript event
            transcript_str = turn_result.get("transcript", "")
            if transcript_str:
                await websocket.send_json({
                    "type": "transcript",
                    "text": transcript_str,
                    "is_final": True,
                })

            # Send intent event
            if "intent" in turn_result:
                await websocket.send_json({
                    "type": "intent",
                    "intent": turn_result["intent"],
                })

            # Send action request if confirmation needed
            if "action_request" in turn_result:
                await websocket.send_json({
                    "type": "action_request",
                    **turn_result["action_request"],
                })

            # Send action result if executed
            if "action_result" in turn_result:
                await websocket.send_json({
                    "type": "action_result",
                    **turn_result["action_result"],
                })

            # Send response text bubble
            if turn_result.get("response_text"):
                await websocket.send_json({
                    "type": "response_text",
                    "text": turn_result["response_text"],
                })

            # Stream audio bytes to browser
            audio_bytes = turn_result.get("audio_bytes", b"")
            if audio_bytes and websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_bytes(audio_bytes)

            # Send turn completion
            await websocket.send_json({
                "type": "turn_complete",
                "latency_ms": turn_result.get("latency_ms", 0),
            })

    except WebSocketDisconnect:
        logger.info("Voice session disconnected: %s for user: %s", session_id, user_email)
    except Exception as exc:
        logger.error("Error in voice session %s: %s", session_id, exc)
    finally:
        async with _connection_lock:
            if user_email in _active_user_connections:
                _active_user_connections[user_email].discard(websocket)
                if not _active_user_connections[user_email]:
                    _active_user_connections.pop(user_email, None)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
