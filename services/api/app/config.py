"""Environment-backed settings: data directory, OpenAI, and CORS allowlist."""
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# Resolve repo root: app/config.py -> services/api -> repository root
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = Path(os.getenv("DATA_DIR", str(_REPO_ROOT / "data"))).resolve()
SESSIONS_DIR = DATA_DIR / "sessions"

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.4")
OPENAI_QUERY_ROUTER_MODEL = os.getenv("OPENAI_QUERY_ROUTER_MODEL", "gpt-4o-mini")
OPENAI_WHISPER_MODEL = os.getenv("OPENAI_WHISPER_MODEL", "whisper-1")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Optional: GeoNames username for /geo/* (city search, timezone from lat/lng)
GEONAMES_USERNAME = os.getenv("GEONAMES_USERNAME", "").strip()

# Whisper API max upload (OpenAI limit is 25 MB for this endpoint)
WHISPER_MAX_BYTES = 25 * 1024 * 1024

_extra_origins = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "").split(",")
    if o.strip()
]

CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    *_extra_origins,
]
