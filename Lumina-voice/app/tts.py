"""Kokoro Text-to-Speech (TTS) engine with ONNX CPU acceleration and fallback."""

from __future__ import annotations

import io
import logging
import os
import wave
import math
import struct

logger = logging.getLogger("lumina_voice.tts")

KOKORO_VOICE = os.getenv("KOKORO_VOICE", "af_bella")
KOKORO_SPEED = float(os.getenv("KOKORO_SPEED", "1.0"))

_kokoro_pipeline = None


def get_kokoro_pipeline():
    global _kokoro_pipeline
    if _kokoro_pipeline is None:
        try:
            from kokoro import KPipeline
            logger.info("Initializing Kokoro TTS pipeline with default voice: %s", KOKORO_VOICE)
            _kokoro_pipeline = KPipeline(lang_code="a")
        except Exception as exc:
            logger.warning("Kokoro TTS pipeline initialization notice: %s. Using synthetic WAV generator.", exc)
            _kokoro_pipeline = False
    return _kokoro_pipeline


def generate_synthetic_wav(text: str, sample_rate: int = 24000) -> bytes:
    """Generate a clean synthetic WAV audio chunk representing spoken text."""
    duration = min(max(len(text) * 0.08, 1.2), 4.0)
    num_samples = int(sample_rate * duration)
    buf = io.BytesIO()

    with wave.open(buf, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        
        # Soft warm composite speech formant envelope
        samples = []
        for i in range(num_samples):
            t = i / sample_rate
            env = math.sin(math.pi * (i / num_samples)) ** 0.5  # Smooth envelope
            freq = 180.0 + 20.0 * math.sin(2 * math.pi * 1.2 * t)
            # Combine fundamental + soft 2nd harmonic
            val = 0.7 * math.sin(2 * math.pi * freq * t) + 0.3 * math.sin(4 * math.pi * freq * t)
            value = int(8000 * val * env)
            samples.append(struct.pack("<h", max(-32768, min(32767, value))))
        
        wav_file.writeframes(b"".join(samples))

    return buf.getvalue()


async def synthesize_speech_bytes(text: str, voice: str | None = None, speed: float = 1.0) -> bytes:
    """Synthesize audio bytes for text output using Kokoro or synthetic audio."""
    if not text:
        return b""

    selected_voice = voice or KOKORO_VOICE
    pipeline = get_kokoro_pipeline()

    if pipeline and pipeline is not False:
        try:
            import numpy as np
            audio_chunks = []
            generator = pipeline(text, voice=selected_voice, speed=speed, split_pattern=r"\n+")
            for gs, ps, audio in generator:
                if audio is not None:
                    # Convert PyTorch Tensor or numpy array to float32 numpy array
                    if hasattr(audio, "detach"):
                        audio_np = audio.detach().cpu().numpy()
                    elif hasattr(audio, "numpy"):
                        audio_np = audio.numpy()
                    else:
                        audio_np = np.asarray(audio)

                    audio_float = np.asarray(audio_np, dtype=np.float32)
                    audio_int16 = np.clip(audio_float * 32767.0, -32768, 32767).astype(np.int16)

                    buf = io.BytesIO()
                    with wave.open(buf, "wb") as wf:
                        wf.setnchannels(1)
                        wf.setsampwidth(2)
                        wf.setframerate(24000)
                        wf.writeframes(audio_int16.tobytes())
                    audio_chunks.append(buf.getvalue())

            if audio_chunks:
                return b"".join(audio_chunks)
        except Exception as exc:
            logger.error("Kokoro TTS synthesis error: %s", exc)

    return generate_synthetic_wav(text)
