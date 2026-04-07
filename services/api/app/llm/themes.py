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
      "title": "very short theme name in English (about 2–6 words)",
      "title_zh": "对应的中文主题名（2–6字）",
      "description": "one brief sentence in English only (max ~140 characters); suggestive, not a conclusion",
      "description_zh": "对应的中文描述（不超过70个字）；暗示性的，不是结论",
      "hints": [],
      "reading_priority": ""
    }
  ],
  "suggested_reading_priorities": [],
  "suggested_reading_priorities_zh": []
}
Produce exactly 3 or 4 small themes. Each theme must have title + title_zh + description + description_zh; leave hints as [] and reading_priority as "".
Leave suggested_reading_priorities and suggested_reading_priorities_zh as [] unless two crisp overall priorities are obvious; when populated, provide matching Chinese translations in suggested_reading_priorities_zh."""


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
