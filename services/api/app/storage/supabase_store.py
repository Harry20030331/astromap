"""Supabase Postgres persistence for chart sessions.

Drop-in replacement for local_json.py — all public functions have the same
names but require an additional `user_id` parameter so data is properly
scoped per authenticated user.
"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from supabase import create_client, Client

from app.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

_client: Client | None = None


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client


def _row_to_record(row: dict[str, Any]) -> dict[str, Any]:
    """Convert a Postgres row dict to the flat record format used by main.py."""
    return {
        "id": row["id"],
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
        "birth": row.get("birth") or {},
        "chart": row.get("chart") or {},
        "features": row.get("features"),
        "analysis_preferences": row.get("analysis_preferences"),
        "themes": row.get("themes"),
        "themes_status": row.get("themes_status"),
        "queries": row.get("queries") or [],
        "structure_interpretations": row.get("structure_interpretations") or {},
    }


def create_session_record(payload: dict[str, Any], user_id: str) -> dict[str, Any]:
    birth = payload.get("birth") or {}
    label = birth.get("label") or birth.get("name")
    row = {
        "user_id": user_id,
        "label": label,
        "birth": birth,
        "chart": payload.get("chart") or {},
        "features": payload.get("features"),
        "analysis_preferences": payload.get("analysis_preferences"),
        "themes": payload.get("themes"),
        "themes_status": payload.get("themes_status", "generating"),
        "queries": payload.get("queries") or [],
        "structure_interpretations": payload.get("structure_interpretations") or {},
    }
    result = _get_client().table("sessions").insert(row).execute()
    return _row_to_record(result.data[0])


def get_session(session_id: str, user_id: str) -> dict[str, Any] | None:
    result = (
        _get_client()
        .table("sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if result.data is None:
        return None
    return _row_to_record(result.data)


def save_session(record: dict[str, Any], user_id: str) -> None:
    birth = record.get("birth") or {}
    label = birth.get("label") or birth.get("name")
    updates: dict[str, Any] = {
        "label": label,
        "birth": birth,
        "chart": record.get("chart") or {},
        "features": record.get("features"),
        "analysis_preferences": record.get("analysis_preferences"),
        "themes": record.get("themes"),
        "themes_status": record.get("themes_status"),
        "queries": record.get("queries") or [],
        "structure_interpretations": record.get("structure_interpretations") or {},
        "updated_at": _now_iso(),
    }
    (
        _get_client()
        .table("sessions")
        .update(updates)
        .eq("id", record["id"])
        .eq("user_id", user_id)
        .execute()
    )


def list_session_summaries(user_id: str) -> list[dict[str, Any]]:
    result = (
        _get_client()
        .table("sessions")
        .select("id,label,birth,created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    out: list[dict[str, Any]] = []
    for row in result.data:
        birth = row.get("birth") or {}
        label = row.get("label") or birth.get("label") or birth.get("name") or "Session"
        out.append(
            {
                "id": row["id"],
                "label": label,
                "created_at": row.get("created_at"),
            }
        )
    return out


def delete_session(session_id: str, user_id: str) -> bool:
    result = (
        _get_client()
        .table("sessions")
        .delete()
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
    return len(result.data) > 0
