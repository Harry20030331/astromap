"""HTTP-level tests for session CRUD (no OpenAI calls)."""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_patch_analysis_preferences(monkeypatch):
    monkeypatch.setattr("app.main._run_themes_job", lambda sid: None)

    body = {
        "label": "Prefs test",
        "birth_date": "1990-05-15",
        "birth_time": "14:30",
        "tz_str": "Europe/London",
        "lat": 51.5074,
        "lng": -0.1278,
    }
    r = client.post("/sessions", json=body)
    assert r.status_code == 200, r.text
    sid = r.json()["session_id"]

    p = client.patch(
        f"/sessions/{sid}/analysis-preferences",
        json={
            "included_points": ["Sun", "Moon", "Mercury"],
            "aspect_orbs": {"conjunction": 2.0},
        },
    )
    assert p.status_code == 200, p.text
    data = p.json()
    assert "analysis_preferences" in data
    assert set(data["analysis_preferences"]["included_points"]) == {"Sun", "Moon", "Mercury"}
    assert data["analysis_preferences"]["aspect_orbs"]["conjunction"] == 2.0

    g = client.get(f"/sessions/{sid}")
    assert g.status_code == 200
    full = g.json()
    assert sum(full["features"]["elements"].values()) == 3


def test_create_and_get_session(monkeypatch):
    monkeypatch.setattr("app.main._run_themes_job", lambda sid: None)

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
    assert full.get("themes_status") == "generating"
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


def test_geo_cities_when_geonames_disabled(monkeypatch):
    monkeypatch.setattr("app.main.GEONAMES_USERNAME", "")
    r = client.get("/geo/cities", params={"q": "London"})
    assert r.status_code == 503


def test_geo_cities_mocked(monkeypatch):
    monkeypatch.setattr("app.main.GEONAMES_USERNAME", "demo")

    def fake_search(*, username: str, query: str, country: str | None = None):
        assert username == "demo"
        assert query == "Lon"
        assert country == "GB"
        return [
            {
                "name": "London",
                "admin_name": "England",
                "country_code": "GB",
                "country_name": "United Kingdom",
                "lat": 51.5,
                "lng": -0.12,
            }
        ]

    monkeypatch.setattr("app.main.search_cities", fake_search)
    r = client.get("/geo/cities", params={"q": "Lon", "country": "gb"})
    assert r.status_code == 200
    data = r.json()
    assert len(data["cities"]) == 1
    assert data["cities"][0]["name"] == "London"


def test_geo_timezone_mocked(monkeypatch):
    monkeypatch.setattr("app.main.GEONAMES_USERNAME", "demo")
    monkeypatch.setattr("app.main.timezone_at_coords", lambda **kw: "Europe/London")
    r = client.get("/geo/timezone", params={"lat": 51.5, "lng": -0.12})
    assert r.status_code == 200
    assert r.json()["tz_str"] == "Europe/London"
