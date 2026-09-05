"""Multi-Engine Text-to-Speech (TTS) service with low-latency Neural TTS and fallback."""

from __future__ import annotations

import asyncio
from collections import OrderedDict
import io
import logging
import os
import re
import wave
from typing import Any

logger = logging.getLogger("lumina_voice.tts")

KOKORO_VOICE = os.getenv("KOKORO_VOICE", "af_bella")
KOKORO_SPEED = float(os.getenv("KOKORO_SPEED", "1.0"))

# Voice mapping from Kokoro voice identifiers to high-quality Microsoft Neural Edge-TTS voices
EDGE_VOICE_MAP: dict[str, str] = {
    "af_bella": "en-US-JennyNeural",
    "af_sarah": "en-US-AriaNeural",
    "am_adam": "en-US-GuyNeural",
    "bf_emma": "en-GB-SoniaNeural",
    "bm_george": "en-GB-RyanNeural",
    "hindi_natural": "hi-IN-SwaraNeural",
    "hi_female": "hi-IN-SwaraNeural",
    "hi_male": "hi-IN-MadhurNeural",
}

EDGE_INDIC_VOICE = "hi-IN-SwaraNeural"

# In-memory LRU Audio Cache for instant sub-millisecond responses on repeated queries
_AUDIO_CACHE: OrderedDict[tuple[str, str, float], tuple[bytes, str]] = OrderedDict()
_CACHE_MAX_SIZE = 256
_cache_lock = asyncio.Lock()

_kokoro_pipeline: Any = None
_kokoro_initialized = False


def is_devanagari_text(text: str) -> bool:
    """Check if text contains Devanagari characters (Hindi/Sanskrit)."""
    return bool(re.search(r"[\u0900-\u097F\u1CD0-\u1CFF\uA8E0-\uA8FF]", text))


def get_kokoro_pipeline():
    """Lazily load Kokoro TTS pipeline if available."""
    global _kokoro_pipeline, _kokoro_initialized
    if not _kokoro_initialized:
        _kokoro_initialized = True
        try:
            from kokoro import KPipeline
            logger.info("Initializing Kokoro TTS pipeline with default voice: %s", KOKORO_VOICE)
            _kokoro_pipeline = KPipeline(lang_code="a")
        except Exception as exc:
            logger.warning("Kokoro TTS pipeline initialization notice: %s. Local fallback disabled.", exc)
            _kokoro_pipeline = False
    return _kokoro_pipeline


def _format_edge_speed(speed: float) -> str:
    """Convert float speed (e.g. 1.0, 1.2, 0.8) to edge-tts rate format (e.g. '+0%', '+20%', '-20%')."""
    percent = int(round((speed - 1.0) * 100))
    if percent >= 0:
        return f"+{percent}%"
    return f"{percent}%"


async def _synthesize_edge_tts(text: str, voice: str, speed: float) -> tuple[bytes, str] | None:
    """Synthesize speech using Microsoft Edge Neural TTS for ultra-low latency & natural audio."""
    try:
        import edge_tts

        is_indic = is_devanagari_text(text)
        if is_indic:
            selected_edge_voice = EDGE_INDIC_VOICE
        else:
            selected_edge_voice = EDGE_VOICE_MAP.get(voice, voice if "Neural" in voice else "en-US-JennyNeural")

        rate_str = _format_edge_speed(speed)
        communicate = edge_tts.Communicate(text=text, voice=selected_edge_voice, rate=rate_str)
        audio_chunks: list[bytes] = []

        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_chunks.append(chunk["data"])

        if audio_chunks:
            mp3_bytes = b"".join(audio_chunks)
            return mp3_bytes, "audio/mpeg"
    except Exception as exc:
        logger.warning("Edge-TTS synthesis attempt notice: %s. Falling back to local/gTTS engine.", exc)

    return None


def _synthesize_kokoro_sync(text: str, voice: str, speed: float) -> bytes | None:
    """Synchronous CPU worker for Kokoro TTS with single-header WAV concatenation."""
    pipeline = get_kokoro_pipeline()
    if not pipeline or pipeline is False:
        return None

    try:
        import numpy as np

        generator = pipeline(text, voice=voice, speed=speed, split_pattern=r"\n+")
        pcm_chunks: list[np.ndarray] = []

        for gs, ps, audio in generator:
            if audio is not None:
                if hasattr(audio, "detach"):
                    audio_np = audio.detach().cpu().numpy()
                elif hasattr(audio, "numpy"):
                    audio_np = audio.numpy()
                else:
                    audio_np = np.asarray(audio)

                audio_float = np.asarray(audio_np, dtype=np.float32)
                audio_int16 = np.clip(audio_float * 32767.0, -32768, 32767).astype(np.int16)
                pcm_chunks.append(audio_int16)

        if not pcm_chunks:
            return None

        # Concatenate raw PCM audio samples into a single buffer FIRST
        full_pcm = np.concatenate(pcm_chunks) if len(pcm_chunks) > 1 else pcm_chunks[0]

        # Write ONE clean WAV file with a single valid RIFF header
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(24000)
            wf.writeframes(full_pcm.tobytes())

        return buf.getvalue()
    except Exception as exc:
        logger.error("Kokoro TTS sync execution error: %s", exc)
        return None


async def _synthesize_gtts(text: str, speed: float) -> tuple[bytes, str] | None:
    """Synthesize speech using gTTS as a reliable cloud fallback."""
    try:
        from gtts import gTTS

        lang = "hi" if is_devanagari_text(text) else "en"
        loop = asyncio.get_running_loop()

        def _run_gtts():
            tts = gTTS(text=text, lang=lang, slow=(speed < 0.9))
            mp3_fp = io.BytesIO()
            tts.write_to_fp(mp3_fp)
            return mp3_fp.getvalue()

        mp3_bytes = await loop.run_in_executor(None, _run_gtts)
        if mp3_bytes:
            return mp3_bytes, "audio/mpeg"
    except Exception as exc:
        logger.warning("gTTS synthesis fallback notice: %s", exc)

    return None


def generate_clean_silence_wav(duration: float = 0.5, sample_rate: int = 24000) -> bytes:
    """Generate a clean brief silent WAV fallback instead of harsh buzzing sounds."""
    num_samples = int(sample_rate * duration)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(b"\x00\x00" * num_samples)
    return buf.getvalue()


async def synthesize_speech_bytes(
    text: str,
    voice: str | None = None,
    speed: float = 1.0,
) -> tuple[bytes, str]:
    """Synthesize high-quality natural speech audio with ultra-low latency.
    
    Architecture:
    1. Check LRU audio cache for instant sub-millisecond retrieval.
    2. Primary: Microsoft Edge Neural TTS (natural studio voices, ~1s latency, MP3 format).
    3. Secondary: Kokoro Neural TTS (local, single-header WAV format, non-blocking executor).
    4. Tertiary: gTTS (Google Translate Web TTS).
    5. Final fallback: Clean brief silence (never harsh robotic buzzers).
    """
    clean_text = text.strip() if text else ""
    if not clean_text:
        return b"", "audio/wav"

    selected_voice = voice or KOKORO_VOICE
    rounded_speed = round(float(speed), 2)
    cache_key = (clean_text, selected_voice, rounded_speed)

    # 1. Check in-memory audio cache
    async with _cache_lock:
        if cache_key in _AUDIO_CACHE:
            _AUDIO_CACHE.move_to_end(cache_key)
            return _AUDIO_CACHE[cache_key]

    result: tuple[bytes, str] | None = None

    # 2. Try Edge-TTS (Fastest & highest quality neural voices)
    result = await _synthesize_edge_tts(clean_text, selected_voice, rounded_speed)

    # 3. Fallback to Kokoro (Local neural engine on threadpool)
    if not result and not is_devanagari_text(clean_text):
        try:
            loop = asyncio.get_running_loop()
            kokoro_wav = await loop.run_in_executor(
                None, _synthesize_kokoro_sync, clean_text, selected_voice, rounded_speed
            )
            if kokoro_wav:
                result = (kokoro_wav, "audio/wav")
        except Exception as exc:
            logger.warning("Kokoro executor fallback failed: %s", exc)

    # 4. Fallback to gTTS
    if not result:
        result = await _synthesize_gtts(clean_text, rounded_speed)

    # 5. Final fallback if all network & local neural engines are unavailable
    if not result:
        logger.error("All TTS engines failed for text: '%s'. Emitting clean silence.", clean_text[:40])
        result = (generate_clean_silence_wav(1.0), "audio/wav")

    # Store in LRU cache
    async with _cache_lock:
        if len(_AUDIO_CACHE) >= _CACHE_MAX_SIZE:
            _AUDIO_CACHE.popitem(last=False)
        _AUDIO_CACHE[cache_key] = result

    return result



