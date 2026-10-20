"""Shared fixtures. The Overpass document here is SYNTHETIC test data, not OSM data."""

from __future__ import annotations

import pytest

from waerme import benchmarks as bm

LON0, LAT0 = 13.290, 52.475  # roughly Schmargendorf, only to get realistic projected areas


def square(lon: float, lat: float, d_lon: float, d_lat: float) -> list[dict]:
    pts = [(lon, lat), (lon + d_lon, lat), (lon + d_lon, lat + d_lat), (lon, lat + d_lat), (lon, lat)]
    return [{"lon": x, "lat": y} for x, y in pts]


def way(i: int, tags: dict, geom: list[dict]) -> dict:
    return {"type": "way", "id": i, "tags": tags, "geometry": geom}


@pytest.fixture
def test_heat_benchmarks(monkeypatch):
    """Fixed, obviously-fake specific demand values so tests don't depend on pinned IWU numbers."""
    fake = {k: bm.Cited(100.0, "kWh/(m²·a)", "assumption", "TEST VALUE") for k in ("EFH", "RH", "MFH")}
    monkeypatch.setattr(bm, "SPECIFIC_HEAT_DEMAND", fake)
    return fake


@pytest.fixture
def synthetic_doc() -> dict:
    d = 0.0003  # ≈ 20 m x 33 m
    boundary = {
        "type": "relation",
        "id": 1,
        "tags": {"boundary": "administrative", "admin_level": "10", "name": "Testdorf"},
        "members": [{"type": "way", "role": "outer", "ref": 99, "geometry": square(LON0, LAT0, 0.01, 0.01)}],
    }
    return {
        "osm3s": {"timestamp_osm_base": "2026-01-01T00:00:00Z"},
        "elements": [
            boundary,
            way(10, {"building": "apartments", "building:levels": "5"}, square(LON0 + 0.001, LAT0 + 0.001, d, d)),
            way(11, {"building": "house"}, square(LON0 + 0.002, LAT0 + 0.001, d / 2, d / 2)),
            way(12, {"building": "garage"}, square(LON0 + 0.003, LAT0 + 0.001, d / 4, d / 4)),
            way(13, {"building": "school", "roof:shape": "flat"}, square(LON0 + 0.004, LAT0 + 0.004, d, d)),
            way(14, {"building": "yes"}, square(LON0 + 0.005, LAT0 + 0.005, d, d)),  # in residential landuse
            way(15, {"building": "yes"}, square(LON0 + 0.0085, LAT0 + 0.0085, d, d)),  # no landuse -> unknown
            way(16, {"building": "apartments"}, square(LON0 + 0.02, LAT0 + 0.02, d, d)),  # outside district
            way(20, {"landuse": "residential"}, square(LON0 + 0.0045, LAT0 + 0.0045, 0.002, 0.002)),
        ],
    }
