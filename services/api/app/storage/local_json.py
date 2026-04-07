"""JSON file persistence for chart sessions under DATA_DIR/sessions."""
from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.config import SESSIONS_DIR
from app.storage.chart_extract import big_three_signs


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def ensure_sessions_dir() -> None:
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)


def _path(session_id: str) -> Path:
    return SESSIONS_DIR / f"{session_id}.json"


def create_session_record(payload: dict[str, Any]) -> dict[str, Any]:
    ensure_sessions_dir()
    session_id = str(uuid.uuid4())
    now = _now_iso()
    record = {
        "id": session_id,
        "created_at": now,
        "updated_at": now,
        **payload,
    }
    path = _path(session_id)
    path.write_text(json.dumps(record, indent=2, ensure_ascii=False), encoding="utf-8")
    return record


def get_session(session_id: str) -> dict[str, Any] | None:
    path = _path(session_id)
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def save_session(record: dict[str, Any]) -> None:
    ensure_sessions_dir()
    record["updated_at"] = _now_iso()
    sid = record["id"]
    _path(sid).write_text(json.dumps(record, indent=2, ensure_ascii=False), encoding="utf-8")


def list_session_ids() -> list[str]:
    ensure_sessions_dir()
    return sorted(p.stem for p in SESSIONS_DIR.glob("*.json") if p.suffix == ".json")


def delete_session(session_id: str) -> bool:
    """Remove session file (chart, themes, queries, etc.). Returns True if a file was removed."""
    path = _path(session_id)
    if not path.is_file():
        return False
    path.unlink()
    return True


def list_session_summaries() -> list[dict[str, Any]]:
    ensure_sessions_dir()
    out: list[dict[str, Any]] = []
    for p in sorted(SESSIONS_DIR.glob("*.json"), key=lambda x: x.stat().st_mtime, reverse=True):
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        birth = data.get("birth") or {}
        tri = big_three_signs(data.get("chart") if isinstance(data.get("chart"), dict) else None)
        out.append(
            {
                "id": data.get("id", p.stem),
                "label": birth.get("label") or birth.get("name") or "Session",
                "created_at": data.get("created_at"),
                **tri,
            }
        )
    return out
