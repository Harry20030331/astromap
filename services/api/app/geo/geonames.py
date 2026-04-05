"""GeoNames HTTP client: city search and timezone from coordinates."""
from __future__ import annotations

from typing import Any

import httpx

GEONAMES_BASE = "https://secure.geonames.org"
MIN_QUERY_LEN = 2
MAX_QUERY_LEN = 100


def _client() -> httpx.Client:
    return httpx.Client(timeout=12.0)


def search_cities(*, username: str, query: str, country: str | None = None) -> list[dict[str, Any]]:
    q = query.strip()
    if len(q) < MIN_QUERY_LEN:
        return []
    params: dict[str, str] = {
        "q": q,
        "maxRows": "8",
        "username": username,
        "featureClass": "P",
        "type": "json",
    }
    if country:
        params["country"] = country.upper()
    with _client() as c:
        r = c.get(f"{GEONAMES_BASE}/searchJSON", params=params)
    r.raise_for_status()
    data = r.json()
    raw = data.get("geonames") if isinstance(data, dict) else None
    if not isinstance(raw, list):
        return []
    out: list[dict[str, Any]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        try:
            lat = float(item["lat"])
            lng = float(item["lng"])
        except (KeyError, TypeError, ValueError):
            continue
        name = item.get("name")
        if not isinstance(name, str) or not name.strip():
            continue
        out.append(
            {
                "name": name.strip(),
                "admin_name": item.get("adminName1") if isinstance(item.get("adminName1"), str) else None,
                "country_code": item.get("countryCode") if isinstance(item.get("countryCode"), str) else None,
                "country_name": item.get("countryName") if isinstance(item.get("countryName"), str) else None,
                "lat": lat,
                "lng": lng,
            }
        )
    return out


def timezone_at_coords(*, username: str, lat: float, lng: float) -> str:
    params = {"lat": str(lat), "lng": str(lng), "username": username}
    with _client() as c:
        r = c.get(f"{GEONAMES_BASE}/timezoneJSON", params=params)
    r.raise_for_status()
    data = r.json()
    if not isinstance(data, dict):
        raise ValueError("unexpected timezone response")
    tz = data.get("timezoneId") or data.get("timezone") or data.get("tzId")
    if not isinstance(tz, str) or not tz.strip():
        raise ValueError("no timezone for coordinates")
    return tz.strip()
