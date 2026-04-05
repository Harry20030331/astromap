"""OpenAI: synthesize non-authoritative theme hints from structured features JSON."""
from __future__ import annotations

import json
from typing import Any

from openai import OpenAI

from app.config import OPENAI_API_KEY, OPENAI_MODEL


THEMES_SYSTEM = """You are an assistant for professional astrologers. You never state fate or certainty.
You output ONLY valid JSON with this shape:
{
  "themes": [
    {
      "title": "very short theme name (about 2–6 words)",
      "description": "one brief sentence only (max ~140 characters); suggestive, not a conclusion",
      "hints": [],
      "reading_priority": ""
    }
  ],
  "suggested_reading_priorities": []
}
Produce exactly 3 or 4 small themes. Each theme must have title + description; leave hints as [] and reading_priority as "".
Leave suggested_reading_priorities as [] unless two crisp overall priorities are obvious."""


def generate_themes(features: dict[str, Any]) -> dict[str, Any]:
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not set")

    client = OpenAI(api_key=OPENAI_API_KEY)
    user_content = json.dumps(features, ensure_ascii=False)

    resp = client.chat.completions.create(
        model=OPENAI_MODEL,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": THEMES_SYSTEM},
            {
                "role": "user",
                "content": (
                    "Structured chart features (deterministic, from software). "
                    "Synthesize core themes for the astrologer.\n\n"
                    f"{user_content}"
                ),
            },
        ],
        temperature=0.7,
    )
    raw = resp.choices[0].message.content or "{}"
    return json.loads(raw)
