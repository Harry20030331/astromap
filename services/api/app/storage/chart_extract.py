"""Small helpers to read commonly used fields from stored chart JSON."""
from __future__ import annotations

from typing import Any


def big_three_signs(chart: dict[str, Any] | None) -> dict[str, str | None]:
    """Sun / Moon / Ascendant sign strings as returned in chart bodies (e.g. 'Ari')."""
    chart = chart or {}
    bodies = chart.get("bodies") or []
    sun: str | None = None
    moon: str | None = None
    asc: str | None = None
    for b in bodies:
        if not isinstance(b, dict):
            continue
        name = b.get("name")
        sign = b.get("sign")
        if not isinstance(sign, str):
            continue
        if name == "Sun":
            sun = sign
        elif name == "Moon":
            moon = sign
        elif name == "Ascendant":
            asc = sign
    return {"sun_sign": sun, "moon_sign": moon, "asc_sign": asc}
