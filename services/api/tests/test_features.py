"""Golden-style checks for deterministic feature extraction from a fixed birth time."""
from __future__ import annotations

from app.astro.compute import BirthInput, compute_natal
from app.astro.features import extract_features

FIXED_BIRTH = BirthInput(
    name="Snapshot",
    year=1990,
    month=5,
    day=15,
    hour=14,
    minute=30,
    lat=51.5074,
    lng=-0.1278,
    tz_str="Europe/London",
    city="London",
    nation="GB",
)


def test_features_shape_and_snapshot():
    chart = compute_natal(FIXED_BIRTH)
    features = extract_features(chart)

    assert set(features.keys()) == {
        "elements",
        "modalities",
        "stelliums",
        "aspects",
        "house_emphasis",
        "dominant_planets",
    }
    assert features["elements"] == {"fire": 3, "earth": 7, "air": 2, "water": 6}
    assert features["modalities"] == {"cardinal": 7, "fixed": 6, "mutable": 5}
    assert isinstance(features["stelliums"], list)
    assert any("stellium" in s for s in features["stelliums"])
    assert len(features["aspects"]) > 0
    assert all(isinstance(x, str) for x in features["aspects"])
    assert len(features["dominant_planets"]) >= 1
