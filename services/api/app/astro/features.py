"""
Derive structured, deterministic chart features for UI and LLM context.

No ephemeris here: consumes the JSON-like chart dict produced by compute_natal.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

# Aspects included in human-readable shortlists; orbit must be within orb budget
MAJOR_ASPECTS = frozenset({"conjunction", "opposition", "trine", "square", "sextile"})
DEFAULT_ORB_MAX = 6.0

# App default orbs (keep equal to web `DEFAULT_ASPECT_ORBS` in chartPreferences.ts).
DEFAULT_ASPECT_ORBS: dict[str, float] = {
    "conjunction": DEFAULT_ORB_MAX,
    "sextile": DEFAULT_ORB_MAX,
    "square": DEFAULT_ORB_MAX,
    "trine": DEFAULT_ORB_MAX,
    "opposition": DEFAULT_ORB_MAX,
}

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

_ELEM_KEY: dict[str, str] = {
    "Fire": "fire",
    "Earth": "earth",
    "Air": "air",
    "Water": "water",
}
_QUAL_KEY: dict[str, str] = {
    "Cardinal": "cardinal",
    "Fixed": "fixed",
    "Mutable": "mutable",
}

# All celestial names the API may serialize in chart["bodies"] (user may toggle visibility)
ALLOWED_ANALYSIS_POINTS = frozenset(
    STELLIUM_KEYS
    | {
        "Chiron",
        "Mean_Lilith",
        "True_North_Lunar_Node",
        "True_South_Lunar_Node",
        "Ascendant",
        "Descendant",
        "Medium_Coeli",
        "Imum_Coeli",
    }
)

DEFAULT_INCLUDED_POINTS = frozenset(
    STELLIUM_KEYS
    | {
        "True_North_Lunar_Node",
        "True_South_Lunar_Node",
        "Ascendant",
        "Descendant",
        "Medium_Coeli",
        "Imum_Coeli",
    }
)


def _distribution_from_bodies(bodies: list[dict[str, Any]]) -> tuple[dict[str, int], dict[str, int]]:
    elements = {"fire": 0, "earth": 0, "air": 0, "water": 0}
    modalities = {"cardinal": 0, "fixed": 0, "mutable": 0}
    for b in bodies:
        ek = _ELEM_KEY.get(str(b.get("element") or ""), "")
        qk = _QUAL_KEY.get(str(b.get("quality") or ""), "")
        if ek in elements:
            elements[ek] += 1
        if qk in modalities:
            modalities[qk] += 1
    return elements, modalities


def extract_features(
    chart: dict[str, Any],
    *,
    included_points: frozenset[str] | None = None,
    aspect_orbs: dict[str, float] | None = None,
    orb_max: float = DEFAULT_ORB_MAX,
) -> dict[str, Any]:
    """
    Deterministic structured features from serialized chart dict.

    With ``included_points`` and/or ``aspect_orbs``, only those points participate in
    element/modality counts, stelliums (classical subset), house emphasis, aspects,
    and dominant planets. Otherwise behaviour matches the original single-orb pipeline
    using Kerykeion's chart-level element/quality distributions.
    """
    if included_points is None and aspect_orbs is None:
        return _extract_features_legacy(chart, orb_max=orb_max)

    inc = included_points if included_points is not None else DEFAULT_INCLUDED_POINTS
    if not inc:
        inc = DEFAULT_INCLUDED_POINTS

    orbs = {**DEFAULT_ASPECT_ORBS, **(aspect_orbs or {})}

    bodies: list[dict[str, Any]] = chart.get("bodies") or []
    filtered = [b for b in bodies if b.get("name") in inc]

    elements, modalities = _distribution_from_bodies(filtered)

    by_sign: dict[str, list[str]] = defaultdict(list)
    by_house: Counter[str] = Counter()

    for b in filtered:
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

    house_ranked = by_house.most_common()
    house_emphasis = [h for h, c in house_ranked if c >= 2][:5]
    if not house_emphasis and house_ranked:
        house_emphasis = [house_ranked[0][0]]

    aspects = chart.get("aspects") or []
    aspect_strings: list[str] = []
    aspect_counter: Counter[str] = Counter()

    for a in aspects:
        kind = a.get("aspect")
        if kind not in MAJOR_ASPECTS:
            continue
        p1, p2 = a.get("p1"), a.get("p2")
        if not p1 or not p2:
            continue
        if p1 not in inc or p2 not in inc:
            continue
        max_o = float(orbs.get(str(kind), DEFAULT_ORB_MAX))
        if float(a.get("orbit", 99)) > max_o:
            continue
        label = f"{p1} {a['aspect']} {p2}"
        aspect_strings.append(label)
        aspect_counter[p1] += 1
        aspect_counter[p2] += 1

    dominant_planets = [n for n, _ in aspect_counter.most_common(5) if n in inc]
    if not dominant_planets:
        dominant_planets = [b["name"] for b in filtered if b.get("name") in STELLIUM_KEYS][:3]

    return {
        "elements": elements,
        "modalities": modalities,
        "stelliums": stelliums,
        "aspects": aspect_strings[:24],
        "house_emphasis": house_emphasis,
        "dominant_planets": dominant_planets[:5],
    }


def _extract_features_legacy(chart: dict[str, Any], *, orb_max: float) -> dict[str, Any]:
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
