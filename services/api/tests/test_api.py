"""HTTP-level tests for session CRUD (no OpenAI calls)."""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_create_and_get_session():
    body = {
        "label": "Test client",
        "birth_date": "1990-05-15",
        "birth_time": "14:30",
        "tz_str": "Europe/London",
        "lat": 51.5074,
        "lng": -0.1278,
    }
    r = client.post("/sessions", json=body)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "session_id" in data
    assert "chart" in data
    assert "features" in data
    assert "svg_wheel" in data["chart"]
    sid = data["session_id"]

    g = client.get(f"/sessions/{sid}")
    assert g.status_code == 200
    full = g.json()
    assert full["id"] == sid
    assert full["themes"] is None
    assert full["queries"] == []

    lst = client.get("/sessions")
    assert lst.status_code == 200
    ids = [s["id"] for s in lst.json()["sessions"]]
    assert sid in ids


def test_transcribe_unknown_session():
    fake = "00000000-0000-0000-0000-000000000000"
    r = client.post(
        f"/sessions/{fake}/transcribe",
        files={"file": ("rec.webm", b"\x00" * 800, "audio/webm")},
    )
    assert r.status_code == 404
