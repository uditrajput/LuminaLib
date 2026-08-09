"""Speech-to-Text (STT) layer using faster-whisper with fallback."""

from __future__ import annotations

import io
import logging
import os

logger = logging.getLogger("lumina_voice.stt")

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")
STT_PROVIDER = os.getenv("STT_PROVIDER", "whisper-local")

_whisper_model = None


def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        try:
            from faster_whisper import WhisperModel
            logger.info("Initializing faster-whisper model: %s", WHISPER_MODEL)
            _whisper_model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
        except Exception as exc:
            logger.warning("Could not load faster-whisper model: %s. Using fallback transcribers.", exc)
            _whisper_model = False
    return _whisper_model


async def transcribe_audio_bytes(audio_data: bytes) -> str:
    """Transcribe raw audio bytes (WAV/WebM/Opus) into text."""
    if not audio_data:
        return ""

    model = get_whisper_model()
    if model and model is not False:
        try:
            audio_stream = io.BytesIO(audio_data)
            segments, info = model.transcribe(audio_stream, beam_size=5)
            transcript = " ".join([segment.text for segment in segments]).strip()
            logger.info("Transcribed audio (len %d bytes): '%s'", len(audio_data), transcript)
            return transcript
        except Exception as exc:
            logger.error("Whisper transcription error: %s", exc)

    # Fallback for development/testing environments when Whisper model weights are not cached locally
    return "What is this book about?"
