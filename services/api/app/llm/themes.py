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
      "title": "short theme label",
      "hints": ["brief suggestive hint", "..."],
      "reading_priority": "optional short note on what to explore first"
    }
  ],
  "suggested_reading_priorities": ["optional overall priorities"]
}
Produce 3 to 5 themes. Hints must be concise and non-authoritative (suggest, do not conclude)."""


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
