"""
FastAPI application: chart sessions, deterministic compute, OpenAI themes/query, and Whisper STT.

Chart facts always come from the astro pipeline; LLMs only see precomputed JSON.
"""
from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.astro.compute import BirthInput, compute_natal
from app.astro.features import extract_features
from app.config import CORS_ORIGINS, WHISPER_MAX_BYTES
from app.llm import query as query_llm
from app.llm import themes as themes_llm
from app.llm import transcribe as transcribe_llm
from app.storage import local_json as store

app = FastAPI(title="AstraMap API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class BirthCreate(BaseModel):
    label: str | None = None
    birth_date: str = Field(..., description="YYYY-MM-DD")
    birth_time: str = Field(..., description="HH:MM or HH:MM:SS")
    tz_str: str = Field(..., description="IANA timezone e.g. Europe/London")
    lat: float
    lng: float
    city: str | None = Field(default=None, description="Optional; placeholder used if omitted")
    nation: str | None = Field(default=None, max_length=2, description="ISO country; placeholder XX if omitted")


class QueryBody(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)


def _parse_birth(create: BirthCreate) -> BirthInput:
    """Map API birth payload to BirthInput for Kerykeion (strict date/time validation)."""
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", create.birth_date.strip())
    if not m:
        raise HTTPException(status_code=400, detail="birth_date must be YYYY-MM-DD")
    year, month, day = int(m.group(1)), int(m.group(2)), int(m.group(3))

    tm = create.birth_time.strip().split(":")
    if len(tm) < 2:
        raise HTTPException(status_code=400, detail="birth_time must be HH:MM")
    hour, minute = int(tm[0]), int(tm[1])
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        raise HTTPException(status_code=400, detail="invalid birth_time")

    city = create.city or "Unknown"
    nation = (create.nation or "XX").upper()
    name = create.label or "Chart"

    return BirthInput(
        name=name,
        year=year,
        month=month,
        day=day,
        hour=hour,
        minute=minute,
        lat=create.lat,
        lng=create.lng,
        tz_str=create.tz_str,
        city=city,
        nation=nation,
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/sessions")
def list_sessions() -> dict[str, Any]:
    return {"sessions": store.list_session_summaries()}


@app.post("/sessions")
def create_session(body: BirthCreate) -> dict[str, Any]:
    birth_in = _parse_birth(body)
    chart = compute_natal(birth_in)
    features = extract_features(chart)

    birth_record = {
        "label": body.label,
        "name": birth_in.name,
        "birth_date": body.birth_date,
        "birth_time": body.birth_time,
        "tz_str": body.tz_str,
        "lat": body.lat,
        "lng": body.lng,
        "city": birth_in.city,
        "nation": birth_in.nation,
    }

    record = store.create_session_record(
        {
            "birth": birth_record,
            "chart": chart,
            "features": features,
            "themes": None,
            "queries": [],
        }
    )
    return {
        "session_id": record["id"],
        "birth": birth_record,
        "chart": chart,
        "features": features,
    }


@app.get("/sessions/{session_id}")
def get_session(session_id: str) -> dict[str, Any]:
    rec = store.get_session(session_id)
    if not rec:
        raise HTTPException(status_code=404, detail="session not found")
    return rec


@app.post("/sessions/{session_id}/themes")
def post_themes(session_id: str) -> dict[str, Any]:
    rec = store.get_session(session_id)
    if not rec:
        raise HTTPException(status_code=404, detail="session not found")
    try:
        themes_payload = themes_llm.generate_themes(rec["features"])
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e!s}") from e

    rec["themes"] = {
        **themes_payload,
        "generated_at": datetime.now(UTC).isoformat(),
    }
    store.save_session(rec)
    return rec["themes"]


@app.post("/sessions/{session_id}/transcribe")
async def post_transcribe(session_id: str, file: UploadFile = File(...)) -> dict[str, str]:
    """Transcribe uploaded audio via OpenAI Whisper (same API key as chat)."""
    rec = store.get_session(session_id)
    if not rec:
        raise HTTPException(status_code=404, detail="session not found")

    raw = await file.read()
    if len(raw) > WHISPER_MAX_BYTES:
        raise HTTPException(status_code=400, detail="audio file too large (max 25 MB)")

    fname = file.filename or "recording.webm"
    try:
        text = transcribe_llm.transcribe_audio_bytes(raw, filename=fname)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Whisper error: {e!s}") from e

    return {"text": text}


@app.post("/sessions/{session_id}/query")
def post_query(session_id: str, body: QueryBody) -> dict[str, Any]:
    rec = store.get_session(session_id)
    if not rec:
        raise HTTPException(status_code=404, detail="session not found")
    features = rec.get("features") or {}
    aspects_short = features.get("aspects") or []
    try:
        response = query_llm.run_query(features, body.text, aspects_short)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e!s}") from e

    entry = {
        "text": body.text,
        "response": response,
        "ts": datetime.now(UTC).isoformat(),
    }
    rec.setdefault("queries", []).append(entry)
    store.save_session(rec)
    return response
