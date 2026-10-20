"""Area analysis shared by the API (and mirrored in the frontend's static mode).

Rule: a building belongs to the drawn area if its centroid lies inside the polygon.
Heat density = summed estimated heat demand / polygon area (gross area, incl. streets).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import shapely
from shapely.geometry import shape
from shapely.geometry.base import BaseGeometry

from . import benchmarks as bm
from .geo import area_m2

MAX_AREA_HA = 2000.0
MAX_VERTICES = 2000


class AnalysisError(ValueError):
    pass


def band_for(density_mwh_ha_a: float) -> dict:
    for b in bm.HEAT_DENSITY_BANDS:
        if density_mwh_ha_a >= b["min"] and (b["max"] is None or density_mwh_ha_a < b["max"]):
            return b
    raise AssertionError("unreachable: bands cover [0, inf)")


@dataclass
class BuildingIndex:
    """Centroids + numeric properties held as arrays for vectorised point-in-polygon tests."""

    centroids: np.ndarray  # shapely Points
    heat_kwh_a: np.ndarray  # NaN where not estimated
    pv_kwp: np.ndarray
    pv_kwh_a: np.ndarray

    @classmethod
    def from_features(cls, features: list[dict]) -> BuildingIndex:
        pts = shapely.points([f["properties"]["cx"] for f in features], [f["properties"]["cy"] for f in features])

        def col(k: str) -> np.ndarray:
            return np.array(
                [np.nan if f["properties"].get(k) is None else f["properties"][k] for f in features], dtype=float
            )

        return cls(pts, col("heat_kwh_a"), col("pv_kwp"), col("pv_kwh_a"))


def parse_polygon(geojson: dict) -> BaseGeometry:
    if geojson.get("type") == "Feature":
        geojson = geojson.get("geometry") or {}
    if geojson.get("type") not in {"Polygon", "MultiPolygon"}:
        raise AnalysisError("geometry must be a GeoJSON Polygon or MultiPolygon")
    try:
        geom = shape(geojson)
    except Exception as exc:  # noqa: BLE001 - shapely raises several types for malformed input
        raise AnalysisError(f"invalid GeoJSON geometry: {exc}") from exc
    if shapely.get_num_coordinates(geom) > MAX_VERTICES:
        raise AnalysisError(f"polygon has more than {MAX_VERTICES} vertices")
    if not geom.is_valid:
        raise AnalysisError("polygon is not valid (self-intersecting?)")
    if geom.is_empty or geom.area == 0:
        raise AnalysisError("polygon is empty")
    return geom


def analyse(polygon: BaseGeometry, index: BuildingIndex) -> dict:
    area_ha = area_m2(polygon) / 10_000
    if area_ha > MAX_AREA_HA:
        raise AnalysisError(f"area is larger than {MAX_AREA_HA:.0f} ha")
    shapely.prepare(polygon)
    inside = shapely.contains(polygon, index.centroids)
    heat = index.heat_kwh_a[inside]
    estimated = ~np.isnan(heat)
    heat_mwh = float(np.nansum(heat)) / 1000
    density = heat_mwh / area_ha if area_ha > 0 else 0.0
    band = band_for(density)
    return {
        "area_ha": round(area_ha, 2),
        "buildings": int(inside.sum()),
        "buildings_with_heat_estimate": int(estimated.sum()),
        "buildings_without_heat_estimate": int((~estimated).sum()),
        "heat_mwh_a": round(heat_mwh, 1),
        "heat_density_mwh_ha_a": round(density, 1),
        "pv_kwp": round(float(np.nansum(index.pv_kwp[inside])), 1),
        "pv_mwh_a": round(float(np.nansum(index.pv_kwh_a[inside])) / 1000, 1),
        "band": {k: band[k] for k in ("id", "label", "min", "max")},
        "band_source": bm.SOURCES[bm.HEAT_DENSITY_BANDS_SOURCE.source],
        "berlin_reference_threshold_mwh_ha_a": bm.BERLIN_REFERENCE_THRESHOLD.value,
        "indicative": True,
        "method": "Buildings counted by centroid; density = estimated heat demand / drawn area (gross).",
    }
