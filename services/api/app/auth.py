"""FastAPI dependency for Supabase JWT authentication."""
from __future__ import annotations

from fastapi import Header, HTTPException
from supabase import create_client, Client

from app.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment."
            )
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client


def get_current_user_id(authorization: str | None = Header(default=None)) -> str:
    """Extract and verify Supabase JWT; return the user's UUID (sub claim)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization[7:]
    try:
        resp = _get_client().auth.get_user(token)
        if resp.user is None:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return resp.user.id
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc
