"""
Deterministic natal chart computation via Kerykeion (Swiss Ephemeris).

Serializes bodies, house cusps, aspects, element/quality distributions, and an SVG wheel string.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from kerykeion import AstrologicalSubjectFactory, ChartDataFactory, ChartDrawer

# Celestial points listed in the placements table (house cusps use HOUSE_KEYS instead)
BODY_KEYS = (
    "sun",
    "moon",
    "mercury",
    "venus",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
    "pluto",
    "chiron",
    "mean_lilith",
    "true_north_lunar_node",
    "true_south_lunar_node",
    "ascendant",
    "medium_coeli",
    "descendant",
    "imum_coeli",
)

HOUSE_KEYS = (
    "first_house",
    "second_house",
    "third_house",
    "fourth_house",
    "fifth_house",
    "sixth_house",
    "seventh_house",
    "eighth_house",
    "ninth_house",
    "tenth_house",
    "eleventh_house",
    "twelfth_house",
)

_ORDINAL = (
    "1st",
    "2nd",
    "3rd",
    "4th",
    "5th",
    "6th",
    "7th",
    "8th",
    "9th",
    "10th",
    "11th",
    "12th",
)


@dataclass(frozen=True)
class BirthInput:
    name: str
    year: int
    month: int
    day: int
    hour: int
    minute: int
    lat: float
    lng: float
    tz_str: str
    city: str
    nation: str


def _house_index_from_label(house_label: str | None) -> int | None:
    if not house_label:
        return None
    # Kerykeion format, e.g. "Ninth_House"
    parts = house_label.split("_")
    if len(parts) >= 2 and parts[-1] == "House":
        name = parts[0].lower()
        mapping = {
            "first": 1,
            "second": 2,
            "third": 3,
            "fourth": 4,
            "fifth": 5,
            "sixth": 6,
            "seventh": 7,
            "eighth": 8,
            "ninth": 9,
            "tenth": 10,
            "eleventh": 11,
            "twelfth": 12,
        }
        return mapping.get(name)
    return None


def _format_house(house_label: str | None) -> str | None:
    idx = _house_index_from_label(house_label)
    if idx is None:
        return None
    return f"{_ORDINAL[idx - 1]} house"


def _serialize_point(p: Any) -> dict[str, Any]:
    return {
        "name": p.name,
        "sign": p.sign,
        "position": round(p.position, 6),
        "abs_pos": round(p.abs_pos, 6),
        "house": _format_house(p.house),
        "house_raw": p.house,
        "retrograde": p.retrograde,
        "element": p.element,
        "quality": p.quality,
    }


def compute_natal(birth: BirthInput) -> dict[str, Any]:
    """Returns serializable chart dict (includes svg_wheel and distributions)."""
    subject = AstrologicalSubjectFactory.from_birth_data(
        birth.name,
        birth.year,
        birth.month,
        birth.day,
        birth.hour,
        birth.minute,
        city=birth.city,
        nation=birth.nation,
        lng=birth.lng,
        lat=birth.lat,
        tz_str=birth.tz_str,
        online=False,
    )

    chart_data = ChartDataFactory.create_natal_chart_data(
        subject,
        distribution_method="pure_count",
    )

    bodies: list[dict[str, Any]] = []
    for key in BODY_KEYS:
        p = getattr(subject, key, None)
        if p is None:
            continue
        bodies.append(_serialize_point(p))

    houses: list[dict[str, Any]] = []
    for i, key in enumerate(HOUSE_KEYS, start=1):
        cusp = getattr(subject, key, None)
        if cusp is None:
            continue
        houses.append(
            {
                "number": i,
                "label": f"{_ORDINAL[i - 1]} house",
                "sign": cusp.sign,
                "cusp_longitude": round(cusp.position, 6),
                "abs_pos": round(cusp.abs_pos, 6),
            }
        )

    aspects_out: list[dict[str, Any]] = []
    for a in chart_data.aspects:
        aspects_out.append(
            {
                "p1": a.p1_name,
                "p2": a.p2_name,
                "aspect": a.aspect,
                "orbit": round(a.orbit, 4),
                "aspect_degrees": a.aspect_degrees,
            }
        )

    drawer = ChartDrawer(chart_data=chart_data, theme="classic")
    svg_wheel = drawer.generate_wheel_only_svg_string(minify=True, remove_css_variables=True)

    chart: dict[str, Any] = {
        "houses_system": getattr(subject, "houses_system_name", "Placidus"),
        "iso_utc": subject.iso_formatted_utc_datetime,
        "julian_day": subject.julian_day,
        "bodies": bodies,
        "houses": houses,
        "aspects": aspects_out,
        "svg_wheel": svg_wheel,
        "element_distribution": chart_data.element_distribution.model_dump(),
        "quality_distribution": chart_data.quality_distribution.model_dump(),
    }

    return chart
