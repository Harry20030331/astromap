"""OpenAI Whisper API: speech-to-text for short practitioner dictation clips."""
from __future__ import annotations

import io

from openai import OpenAI

from app.config import OPENAI_API_KEY, OPENAI_WHISPER_MODEL


def transcribe_audio_bytes(data: bytes, filename: str = "recording.webm") -> str:
    """
    Transcribe raw audio bytes. Filename extension helps the API infer container/codec.
    """
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not set")

    client = OpenAI(api_key=OPENAI_API_KEY)
    buf = io.BytesIO(data)
    buf.name = filename

    tr = client.audio.transcriptions.create(
        model=OPENAI_WHISPER_MODEL,
        file=buf,
    )
    return (tr.text or "").strip()
