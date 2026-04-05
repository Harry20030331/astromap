"""Pytest fixtures: redirect session storage to a temporary directory per test."""
from __future__ import annotations

import pytest


@pytest.fixture(autouse=True)
def isolated_sessions_dir(tmp_path, monkeypatch):
    root = tmp_path / "data"
    sessions = root / "sessions"
    sessions.mkdir(parents=True)

    # Patch both config and the imported SESSIONS_DIR used by storage helpers
    import app.config as cfg
    import app.storage.local_json as lj

    monkeypatch.setattr(cfg, "DATA_DIR", root)
    monkeypatch.setattr(cfg, "SESSIONS_DIR", sessions)
    monkeypatch.setattr(lj, "SESSIONS_DIR", sessions)
    return sessions
