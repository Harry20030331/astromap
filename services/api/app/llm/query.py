"""OpenAI: query-time interpretation support using features + aspect shortlist (no chart invention)."""
from __future__ import annotations

import json
import re
from typing import Any, Iterator

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

QUERY_STREAM_SYSTEM = """You are an assistant for professional astrologers during live readings.
You receive deterministic chart feature JSON and a practitioner query. You never invent chart facts;
only reference structures that plausibly relate to the given features and aspects.

Output ONLY markdown (no JSON, no code fences). Use exactly these sections in order:

### Chart structures
- 2–3 bullets maximum. Only the single most diagnostic placements or aspects relevant to the query.
  Each bullet: one concise phrase (≤ 15 words). No redundancy.

### Interpretation
- 2–3 bullets maximum. Each bullet: one actionable, non-authoritative insight (≤ 20 words).
  Focus on what matters most for this specific query. No generic astrology filler.

### Suggested follow-ups
- Exactly 3 bullets. Each bullet: one probing, psychologically resonant question the practitioner can ask the client.
  Questions should invite genuine reflection — go beyond surface topics to underlying patterns, fears, desires, or life themes.
  Aim for 15–25 words per question. Avoid generic astrology phrasing; make each question feel personal and specific to this chart.

### Structure details
For EACH structure listed under "Chart structures", write a sub-section using #### with the exact same text as the bullet:

#### [exact structure name]
1–2 sentences. **Bold** the 2–3 key theme words first, then give the sharpest single insight.
Example: "**Tension, autonomy, intimacy** — needs freedom within relationship, not merger."
No preamble, no hedging. Dense and direct.

Rules:
- Use "-" at the start of every bullet line (only in the first three sections).
- Never invent placements not in the provided data.
- If the query is vague, still offer the 3 most useful angles.
- Do not diagnose medical or mental health conditions."""

QUERY_JSON_LANG_EN = "\n\nLanguage: Write every string value in the JSON in clear, natural English."

QUERY_JSON_LANG_ZH = (
    "\n\nLanguage: Write every string value in the JSON in natural Simplified Chinese (简体中文), "
    "suitable for professional astrologers. Keep the JSON keys in English as specified above."
)

QUERY_STREAM_LANG_EN = "\n\nLanguage: Write all substantive content (bullets, questions, #### paragraphs) in English."

QUERY_STREAM_LANG_ZH = """
Language: Write all bullet points, follow-up questions, and prose under each #### heading in natural Simplified Chinese (简体中文).

Critical: Keep the four ### section title lines exactly as written above in English — do not translate them:
### Chart structures
### Interpretation
### Suggested follow-ups
### Structure details

The line after each #### must repeat the exact same structure phrase as in your Chart structures bullets (those bullets are in Chinese; the #### line must match them character-for-character)."""


def _normalize_locale(locale: str | None) -> str:
    if locale == "zh":
        return "zh"
    return "en"


def parse_query_markdown(md: str) -> dict[str, Any]:
    """Turn streamed markdown into the same shape as JSON query responses."""
    out: dict[str, Any] = {
        "relevant_structures": [],
        "interpretation_hints": [],
        "suggested_questions": [],
        "structure_details": {},
    }
    current_list: str | None = None
    in_details = False
    current_detail_key: str | None = None
    current_detail_lines: list[str] = []

    def flush_detail() -> None:
        if current_detail_key and current_detail_lines:
            out["structure_details"][current_detail_key] = " ".join(current_detail_lines).strip()

    for raw in md.splitlines():
        line = raw.strip()

        h4 = re.match(r"^####\s+(.+)$", line, re.IGNORECASE)
        if h4:
            flush_detail()
            current_detail_key = h4.group(1).strip()
            current_detail_lines = []
            continue

        h3 = re.match(r"^###\s+(.+)$", line, re.IGNORECASE)
        if h3:
            flush_detail()
            current_detail_key = None
            current_detail_lines = []
            title = h3.group(1).strip().lower().rstrip(":")
            if "structure" in title and "detail" in title:
                current_list = None
                in_details = True
            elif "structure" in title and "detail" not in title:
                current_list = "relevant_structures"
                in_details = False
            elif "interpretation" in title:
                current_list = "interpretation_hints"
                in_details = False
            elif "follow" in title:
                current_list = "suggested_questions"
                in_details = False
            elif "detail" in title:
                current_list = None
                in_details = True
            else:
                current_list = None
                in_details = False
            continue

        if not line:
            if in_details and current_detail_key and current_detail_lines:
                current_detail_lines.append("")
            continue

        if (line.startswith("- ") or line.startswith("* ")) and current_list:
            out[current_list].append(line[2:].strip())
            continue

        if in_details and current_detail_key is not None:
            current_detail_lines.append(line)

    flush_detail()
    out["structure_details"] = {
        k: v.strip() for k, v in out["structure_details"].items() if v.strip()
    }
    return out


def run_query(
    features: dict[str, Any],
    query_text: str,
    aspects_shortlist: list[str],
    *,
    locale: str | None = None,
) -> dict[str, Any]:
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not set")

    client = OpenAI(api_key=OPENAI_API_KEY)
    payload = {
        "features": features,
        "major_aspects_shortlist": aspects_shortlist[:40],
        "query": query_text,
    }
    user_content = json.dumps(payload, ensure_ascii=False)

    lang = _normalize_locale(locale)
    system = QUERY_SYSTEM + (QUERY_JSON_LANG_ZH if lang == "zh" else QUERY_JSON_LANG_EN)

    resp = client.chat.completions.create(
        model=OPENAI_MODEL,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_content},
        ],
        temperature=0.6,
    )
    raw = resp.choices[0].message.content or "{}"
    return json.loads(raw)


def run_query_stream(
    features: dict[str, Any],
    query_text: str,
    aspects_shortlist: list[str],
    *,
    locale: str | None = None,
) -> tuple[str, str, Iterator[str]]:
    """Build prompts and stream markdown tokens; caller parses full text with parse_query_markdown.

    Returns (system_prompt, user_prompt, token_iterator).
    """
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not set")

    client = OpenAI(api_key=OPENAI_API_KEY)
    payload = {
        "features": features,
        "major_aspects_shortlist": aspects_shortlist[:40],
        "query": query_text,
    }
    user_content = json.dumps(payload, ensure_ascii=False)
    lang = _normalize_locale(locale)
    system = QUERY_STREAM_SYSTEM + (
        QUERY_STREAM_LANG_ZH if lang == "zh" else QUERY_STREAM_LANG_EN
    )

    stream = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_content},
        ],
        temperature=0.6,
        stream=True,
    )

    def token_iter() -> Iterator[str]:
        for chunk in stream:
            choice = chunk.choices[0] if chunk.choices else None
            if not choice or not choice.delta.content:
                continue
            yield choice.delta.content

    return system, user_content, token_iter()
