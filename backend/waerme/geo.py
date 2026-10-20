"""Projection helpers. Areas are computed in ETRS89 / UTM 33N (EPSG:25833), Berlin's official CRS."""

from __future__ import annotations

from functools import lru_cache

from pyproj import Transformer
from shapely.geometry.base import BaseGeometry
from shapely.ops import transform


@lru_cache(maxsize=1)
def _to_utm() -> Transformer:
    return Transformer.from_crs("EPSG:4326", "EPSG:25833", always_xy=True)


def to_utm(geom: BaseGeometry) -> BaseGeometry:
    return transform(_to_utm().transform, geom)


def area_m2(geom_wgs84: BaseGeometry) -> float:
    return to_utm(geom_wgs84).area
