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
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_WHISPER_MODEL = os.getenv("OPENAI_WHISPER_MODEL", "whisper-1")

# Whisper API max upload (OpenAI limit is 25 MB for this endpoint)
WHISPER_MAX_BYTES = 25 * 1024 * 1024

CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
