"""
Derive structured, deterministic chart features for UI and LLM context.

No ephemeris here: consumes the JSON-like chart dict produced by compute_natal.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

# Aspects included in human-readable shortlists; orbit must be within DEFAULT_ORB_MAX
MAJOR_ASPECTS = frozenset({"conjunction", "opposition", "trine", "square", "sextile"})
DEFAULT_ORB_MAX = 6.0

STELLIUM_MIN = 3
# Classical planets only when detecting sign stelliums
STELLIUM_KEYS = frozenset(
    {
        "Sun",
        "Moon",
        "Mercury",
        "Venus",
        "Mars",
        "Jupiter",
        "Saturn",
        "Uranus",
        "Neptune",
        "Pluto",
    }
)


def extract_features(chart: dict[str, Any], orb_max: float = DEFAULT_ORB_MAX) -> dict[str, Any]:
    """Deterministic structured features from serialized chart dict."""
    el = chart.get("element_distribution") or {}
    qm = chart.get("quality_distribution") or {}

    elements = {
        "fire": int(el.get("fire", 0)),
        "earth": int(el.get("earth", 0)),
        "air": int(el.get("air", 0)),
        "water": int(el.get("water", 0)),
    }
    modalities = {
        "cardinal": int(qm.get("cardinal", 0)),
        "fixed": int(qm.get("fixed", 0)),
        "mutable": int(qm.get("mutable", 0)),
    }

    bodies: list[dict[str, Any]] = chart.get("bodies") or []
    by_sign: dict[str, list[str]] = defaultdict(list)
    by_house: Counter[str] = Counter()

    for b in bodies:
        name = b.get("name")
        sign = b.get("sign")
        house = b.get("house")
        if name in STELLIUM_KEYS and sign:
            by_sign[sign].append(name)
        if name in STELLIUM_KEYS and house:
            by_house[house] += 1

    stelliums: list[str] = []
    for sign, names in by_sign.items():
        if len(names) >= STELLIUM_MIN:
            stelliums.append(f"{sign} stellium ({len(names)} planets: {', '.join(names)})")

    # House emphasis: houses with multiple classical planets, else the top house
    house_ranked = by_house.most_common()
    house_emphasis = [h for h, c in house_ranked if c >= 2][:5]
    if not house_emphasis and house_ranked:
        house_emphasis = [house_ranked[0][0]]

    aspects = chart.get("aspects") or []
    aspect_strings: list[str] = []
    aspect_counter: Counter[str] = Counter()

    for a in aspects:
        if a.get("aspect") not in MAJOR_ASPECTS:
            continue
        if float(a.get("orbit", 99)) > orb_max:
            continue
        p1, p2 = a.get("p1"), a.get("p2")
        if not p1 or not p2:
            continue
        label = f"{p1} {a['aspect']} {p2}"
        aspect_strings.append(label)
        aspect_counter[p1] += 1
        aspect_counter[p2] += 1

    dominant_planets = [n for n, _ in aspect_counter.most_common(5)]
    if not dominant_planets:
        dominant_planets = [b["name"] for b in bodies if b.get("name") in STELLIUM_KEYS][:3]

    return {
        "elements": elements,
        "modalities": modalities,
        "stelliums": stelliums,
        "aspects": aspect_strings[:24],
        "house_emphasis": house_emphasis,
        "dominant_planets": dominant_planets[:5],
    }
