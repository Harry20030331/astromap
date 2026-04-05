"""OpenAI: query-time interpretation support using features + aspect shortlist (no chart invention)."""
from __future__ import annotations

import json
from typing import Any

from openai import OpenAI

from app.config import OPENAI_API_KEY, OPENAI_MODEL


QUERY_SYSTEM = """You are an assistant for professional astrologers during live readings.
You receive deterministic chart feature JSON and a practitioner query. You never invent chart facts;
only reference structures that plausibly relate to the given features and aspects.
Output ONLY valid JSON:
{
  "relevant_structures": ["e.g. Venus square Saturn — if consistent with provided aspects"],
  "interpretation_hints": ["short non-authoritative prompts for meaning-making"],
  "suggested_questions": ["questions the astrologer might ask the client"]
}
If the query is vague, still offer useful angles. Do not diagnose medical or mental health conditions."""


def run_query(features: dict[str, Any], query_text: str, aspects_shortlist: list[str]) -> dict[str, Any]:
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not set")

    client = OpenAI(api_key=OPENAI_API_KEY)
    payload = {
        "features": features,
        "major_aspects_shortlist": aspects_shortlist[:40],
        "query": query_text,
    }
    user_content = json.dumps(payload, ensure_ascii=False)

    resp = client.chat.completions.create(
        model=OPENAI_MODEL,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": QUERY_SYSTEM},
            {"role": "user", "content": user_content},
        ],
        temperature=0.6,
    )
    raw = resp.choices[0].message.content or "{}"
    return json.loads(raw)
