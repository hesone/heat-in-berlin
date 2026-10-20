"""Loads the precomputed layers once per process and indexes them."""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache

import shapely
from django.conf import settings
from shapely.geometry import shape
from shapely.strtree import STRtree

from waerme.analysis import BuildingIndex


@dataclass
class Store:
    buildings: list[dict]
    hexagons: dict
    meta: dict
    tree: STRtree
    index: BuildingIndex

    def buildings_in_bbox(self, bbox: tuple[float, float, float, float]) -> list[dict]:
        hits = self.tree.query(shapely.box(*bbox), predicate="intersects")
        return [self.buildings[i] for i in sorted(hits)]


@lru_cache(maxsize=1)
def get_store() -> Store:
    d = settings.DATA_DIR
    buildings = json.loads((d / "buildings.geojson").read_text())["features"]
    geoms = [shape(f["geometry"]) for f in buildings]
    return Store(
        buildings=buildings,
        hexagons=json.loads((d / "hexagons.geojson").read_text()),
        meta=json.loads((d / "meta.json").read_text()),
        tree=STRtree(geoms),
        index=BuildingIndex.from_features(buildings),
    )
