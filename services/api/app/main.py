"""
FastAPI application: chart sessions, deterministic compute, OpenAI themes/query, and Whisper STT.

Chart facts always come from the astro pipeline; LLMs only see precomputed JSON.
"""
from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from typing import Any

import httpx
from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.responses import Response, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.astro.compute import BirthInput, compute_natal
from app.astro.features import (
    ALLOWED_ANALYSIS_POINTS,
    DEFAULT_ASPECT_ORBS,
    DEFAULT_INCLUDED_POINTS,
    MAJOR_ASPECTS,
    extract_features,
)
from app.auth import get_current_user_id
from app.config import CORS_ORIGINS, GEONAMES_USERNAME, WHISPER_MAX_BYTES
from app.geo.geonames import MAX_QUERY_LEN, MIN_QUERY_LEN, search_cities, timezone_at_coords
from app.llm import query as query_llm
from app.query_pipeline_debug import log_stream_llm_input, log_stream_llm_output
from app.llm import themes as themes_llm
from app.llm import transcribe as transcribe_llm
from app.storage import supabase_store as store

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
    locale: str | None = Field(
        default=None,
        description="UI language: 'en' or 'zh'; steers LLM reply language",
    )
    debug_pipeline: bool = Field(
        default=False,
        description="If true, SSE complete event includes system prompt, user JSON, raw markdown for browser devtools",
    )


class ThemesPostBody(BaseModel):
    """force=true re-runs the LLM even when themes are already stored."""

    force: bool = False


class StructureBody(BaseModel):
    structure: str = Field(..., min_length=1, max_length=500)


class AnalysisPreferencesBody(BaseModel):
    """Which chart points drive the wheel, features, and LLM context."""

    included_points: list[str] = Field(..., min_length=1)
    aspect_orbs: dict[str, float] = Field(default_factory=dict)


def _compute_effective_features(rec: dict[str, Any]) -> dict[str, Any]:
    chart = rec.get("chart") or {}
    prefs = rec.get("analysis_preferences")
    if not prefs:
        cached = rec.get("features")
        if cached:
            return cached
        return extract_features(chart)
    raw_inc = prefs.get("included_points") or []
    if not raw_inc:
        return rec.get("features") or extract_features(chart)
    inc = frozenset(str(x) for x in raw_inc)
    ao_raw = prefs.get("aspect_orbs") or {}
    ao = {str(k): float(v) for k, v in ao_raw.items() if str(k) in MAJOR_ASPECTS}
    merged_orbs = {**DEFAULT_ASPECT_ORBS, **ao}
    return extract_features(chart, included_points=inc, aspect_orbs=merged_orbs)


def _normalize_analysis_preferences(body: AnalysisPreferencesBody) -> dict[str, Any]:
    inc = [str(x) for x in body.included_points]
    if not inc:
        raise HTTPException(status_code=400, detail="included_points must be non-empty")
    seen: set[str] = set()
    for n in inc:
        if n not in ALLOWED_ANALYSIS_POINTS:
            raise HTTPException(status_code=400, detail=f"unknown point: {n}")
        seen.add(n)
    unique_inc = sorted(seen)
    merged_orbs = dict(DEFAULT_ASPECT_ORBS)
    for k, v in body.aspect_orbs.items():
        ks = str(k)
        if ks not in MAJOR_ASPECTS:
            raise HTTPException(status_code=400, detail=f"unknown aspect type: {k}")
        fv = float(v)
        if not (0.0 <= fv <= 15.0):
            raise HTTPException(status_code=400, detail=f"orb for {ks} must be 0–15")
        merged_orbs[ks] = fv
    return {"included_points": unique_inc, "aspect_orbs": merged_orbs}


def _themes_nonempty(themes: Any) -> bool:
    if not themes or not isinstance(themes, dict):
        return False
    t = themes.get("themes")
    return isinstance(t, list) and len(t) > 0


def _themes_generating_response() -> dict[str, Any]:
    return {
        "generating": True,
        "themes": [],
        "suggested_reading_priorities": [],
    }


def _run_themes_job(session_id: str, user_id: str) -> None:
    """Background: compute themes from features and persist (idempotent if already saved)."""
    try:
        rec = store.get_session(session_id, user_id)
        if not rec:
            return
        if _themes_nonempty(rec.get("themes")):
            rec["themes_status"] = "ready"
            store.save_session(rec, user_id)
            return
        features = _compute_effective_features(rec)
        themes_payload = themes_llm.generate_themes(features)
    except Exception:
        rec = store.get_session(session_id, user_id)
        if rec:
            rec["themes_status"] = "failed"
            store.save_session(rec, user_id)
        return

    rec = store.get_session(session_id, user_id)
    if not rec:
        return
    if _themes_nonempty(rec.get("themes")):
        return
    rec["themes"] = {
        **themes_payload,
        "generated_at": datetime.now(UTC).isoformat(),
    }
    rec["themes_status"] = "ready"
    rec["features"] = features
    store.save_session(rec, user_id)


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


def _geonames_user() -> str:
    if not GEONAMES_USERNAME:
        raise HTTPException(
            status_code=503,
            detail="GeoNames is not configured. Set GEONAMES_USERNAME in the API environment.",
        )
    return GEONAMES_USERNAME


def _validate_geo_query(q: str) -> str:
    s = q.strip()
    if len(s) < MIN_QUERY_LEN:
        raise HTTPException(
            status_code=400,
            detail=f"q must be at least {MIN_QUERY_LEN} characters",
        )
    if len(s) > MAX_QUERY_LEN:
        raise HTTPException(status_code=400, detail="q is too long")
    if any(c in s for c in "\x00\n\r"):
        raise HTTPException(status_code=400, detail="invalid q")
    return s


def _validate_country_code(country: str | None) -> str | None:
    if country is None or country.strip() == "":
        return None
    c = country.strip().upper()
    if len(c) != 2 or not c.isalpha():
        raise HTTPException(status_code=400, detail="country must be a 2-letter ISO code")
    return c


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/geo/cities")
def geo_cities(q: str, country: str | None = None) -> dict[str, Any]:
    """Search populated places (GeoNames). Requires GEONAMES_USERNAME."""
    user = _geonames_user()
    qv = _validate_geo_query(q)
    cv = _validate_country_code(country)
    try:
        hits = search_cities(username=user, query=qv, country=cv)
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"GeoNames error: {e!s}") from e
    return {"cities": hits}


@app.get("/geo/timezone")
def geo_timezone(lat: float, lng: float) -> dict[str, str]:
    """IANA timezone for coordinates (GeoNames timezoneJSON)."""
    user = _geonames_user()
    if lat < -90 or lat > 90:
        raise HTTPException(status_code=400, detail="lat out of range")
    if lng < -180 or lng > 180:
        raise HTTPException(status_code=400, detail="lng out of range")
    try:
        tz = timezone_at_coords(username=user, lat=lat, lng=lng)
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"GeoNames error: {e!s}") from e
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return {"tz_str": tz}


@app.get("/sessions")
def list_sessions(user_id: str = Depends(get_current_user_id)) -> dict[str, Any]:
    return {"sessions": store.list_session_summaries(user_id)}


@app.post("/sessions")
def create_session(
    body: BirthCreate,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
) -> dict[str, Any]:
    birth_in = _parse_birth(body)
    chart = compute_natal(birth_in)
    features = extract_features(
        chart,
        included_points=DEFAULT_INCLUDED_POINTS,
        aspect_orbs=DEFAULT_ASPECT_ORBS,
    )
    default_prefs = {
        "included_points": sorted(DEFAULT_INCLUDED_POINTS),
        "aspect_orbs": dict(DEFAULT_ASPECT_ORBS),
    }

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
            "analysis_preferences": default_prefs,
            "themes": None,
            "themes_status": "generating",
            "queries": [],
        },
        user_id,
    )
    background_tasks.add_task(_run_themes_job, record["id"], user_id)
    return {
        "session_id": record["id"],
        "birth": birth_record,
        "chart": chart,
        "features": features,
    }


@app.get("/sessions/{session_id}")
def get_session(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
) -> dict[str, Any]:
    rec = store.get_session(session_id, user_id)
    if not rec:
        raise HTTPException(status_code=404, detail="session not found")
    out = dict(rec)
    out["features"] = _compute_effective_features(rec)
    return out


@app.delete("/sessions/{session_id}", status_code=204)
def delete_session(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
) -> Response:
    if not store.delete_session(session_id, user_id):
        raise HTTPException(status_code=404, detail="session not found")
    return Response(status_code=204)


@app.patch("/sessions/{session_id}/analysis-preferences")
def patch_analysis_preferences(
    session_id: str,
    body: AnalysisPreferencesBody,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
) -> dict[str, Any]:
    rec = store.get_session(session_id, user_id)
    if not rec:
        raise HTTPException(status_code=404, detail="session not found")
    normalized = _normalize_analysis_preferences(body)
    rec["analysis_preferences"] = normalized
    chart = rec.get("chart") or {}
    rec["features"] = extract_features(
        chart,
        included_points=frozenset(normalized["included_points"]),
        aspect_orbs=normalized["aspect_orbs"],
    )
    rec["themes"] = None
    rec["themes_status"] = "generating"
    store.save_session(rec, user_id)
    background_tasks.add_task(_run_themes_job, session_id, user_id)
    return {
        "analysis_preferences": normalized,
        "features": rec["features"],
        "themes_status": rec["themes_status"],
    }


@app.post("/sessions/{session_id}/themes")
def post_themes(
    session_id: str,
    background_tasks: BackgroundTasks,
    body: ThemesPostBody = ThemesPostBody(),
    user_id: str = Depends(get_current_user_id),
) -> dict[str, Any]:
    rec = store.get_session(session_id, user_id)
    if not rec:
        raise HTTPException(status_code=404, detail="session not found")

    if not body.force and _themes_nonempty(rec.get("themes")):
        return rec["themes"]

    if not body.force and rec.get("themes_status") == "generating":
        return _themes_generating_response()

    if not body.force and rec.get("themes_status") == "failed":
        rec["themes_status"] = "generating"
        store.save_session(rec, user_id)
        background_tasks.add_task(_run_themes_job, session_id, user_id)
        return _themes_generating_response()

    if not body.force and rec.get("themes_status") is None and not _themes_nonempty(rec.get("themes")):
        rec["themes_status"] = "generating"
        store.save_session(rec, user_id)
        background_tasks.add_task(_run_themes_job, session_id, user_id)
        return _themes_generating_response()

    try:
        eff = _compute_effective_features(rec)
        themes_payload = themes_llm.generate_themes(eff)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e!s}") from e

    rec["themes"] = {
        **themes_payload,
        "generated_at": datetime.now(UTC).isoformat(),
    }
    rec["themes_status"] = "ready"
    rec["features"] = eff
    store.save_session(rec, user_id)
    return rec["themes"]


@app.post("/sessions/{session_id}/transcribe")
async def post_transcribe(
    session_id: str,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
) -> dict[str, str]:
    """Transcribe uploaded audio via OpenAI Whisper (same API key as chat)."""
    rec = store.get_session(session_id, user_id)
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
def post_query(
    session_id: str,
    body: QueryBody,
    user_id: str = Depends(get_current_user_id),
) -> dict[str, Any]:
    rec = store.get_session(session_id, user_id)
    if not rec:
        raise HTTPException(status_code=404, detail="session not found")
    features = _compute_effective_features(rec)
    aspects_short = features.get("aspects") or []
    try:
        response = query_llm.run_query(
            features, body.text, aspects_short, locale=body.locale
        )
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
    store.save_session(rec, user_id)
    return response


@app.post("/sessions/{session_id}/query/stream")
def post_query_stream(
    session_id: str,
    body: QueryBody,
    user_id: str = Depends(get_current_user_id),
) -> StreamingResponse:
    """Same inputs as /query; streams markdown chunks via SSE, then saves parsed result."""
    rec = store.get_session(session_id, user_id)
    if not rec:
        raise HTTPException(status_code=404, detail="session not found")
    features = _compute_effective_features(rec)
    aspects_short = features.get("aspects") or []

    def event_generator():
        pieces: list[str] = []
        try:
            sys_msg, user_msg = query_llm.build_query_stream_messages(
                features, body.text, aspects_short, locale=body.locale
            )
            log_stream_llm_input(
                session_id=session_id,
                locale=body.locale,
                query_text=body.text,
                system=sys_msg,
                user_content=user_msg,
            )
            for token in query_llm.run_query_stream(
                features, body.text, aspects_short, locale=body.locale
            ):
                pieces.append(token)
                yield f"data: {json.dumps({'type': 'delta', 'content': token})}\n\n"
            md = "".join(pieces)
            response = query_llm.parse_query_markdown(md)
            log_stream_llm_output(
                session_id=session_id, markdown=md, parsed=response
            )
            entry = {
                "text": body.text,
                "response": response,
                "ts": datetime.now(UTC).isoformat(),
            }
            rec.setdefault("queries", []).append(entry)
            if response.get("structure_details"):
                rec.setdefault("structure_interpretations", {}).update(response["structure_details"])
            store.save_session(rec, user_id)
            complete_ev: dict[str, Any] = {"type": "complete", "response": response}
            if body.debug_pipeline:
                complete_ev["debug"] = {
                    "session_id": session_id,
                    "locale": body.locale,
                    "query_text": body.text,
                    "system_prompt": sys_msg,
                    "user_json": user_msg,
                    "raw_markdown": md,
                    "parsed_response": response,
                }
            yield f"data: {json.dumps(complete_ev, ensure_ascii=False)}\n\n"
        except RuntimeError as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': f'LLM error: {e!s}'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/sessions/{session_id}/structure/stream")
def post_structure_stream(
    session_id: str,
    body: StructureBody,
    user_id: str = Depends(get_current_user_id),
) -> StreamingResponse:
    """Stream a focused prose interpretation of one specific chart structure."""
    rec = store.get_session(session_id, user_id)
    if not rec:
        raise HTTPException(status_code=404, detail="session not found")
    features = _compute_effective_features(rec)
    aspects_short = features.get("aspects") or []

    def event_generator():
        pieces: list[str] = []
        try:
            for token in query_llm.run_structure_stream(features, body.structure, aspects_short):
                pieces.append(token)
                yield f"data: {json.dumps({'type': 'delta', 'content': token})}\n\n"
            full_text = "".join(pieces)
            rec.setdefault("structure_interpretations", {})[body.structure] = full_text
            store.save_session(rec, user_id)
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"
        except RuntimeError as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': f'LLM error: {e!s}'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
