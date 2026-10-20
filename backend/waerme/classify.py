"""Map OSM tags to the building categories used for estimates.

Categories:
  EFH, RH, MFH      residential, heat demand is estimated (IWU typology)
  non_residential   heated non-residential use; PV estimated, heat NOT estimated
  unknown           cannot be classified; PV estimated, heat NOT estimated
  unheated          garages, sheds, allotment huts etc.; dropped from all layers
"""

from __future__ import annotations

from dataclasses import dataclass

EFH_TAGS = {"house", "detached", "semidetached_house", "bungalow", "farm"}
RH_TAGS = {"terrace"}
MFH_TAGS = {"apartments", "dormitory"}
GENERIC_TAGS = {"yes", "residential"}
NON_RESIDENTIAL_TAGS = {
    "commercial",
    "office",
    "retail",
    "supermarket",
    "kiosk",
    "school",
    "kindergarten",
    "university",
    "college",
    "hospital",
    "public",
    "civic",
    "government",
    "church",
    "chapel",
    "mosque",
    "synagogue",
    "temple",
    "religious",
    "hotel",
    "industrial",
    "warehouse",
    "sports_hall",
    "sports_centre",
    "train_station",
    "station",
    "transportation",
    "mall",
    "guardhouse",
    "fire_station",
    "library",
    "museum",
    "community_centre",
    "townhall",
    "embassy",
}
UNHEATED_TAGS = {
    "garage",
    "garages",
    "carport",
    "shed",
    "roof",
    "hut",
    "greenhouse",
    "construction",
    "ruins",
    "transformer_tower",
    "service",
    "bunker",
    "container",
    "tent",
    "boathouse",
    "cabin",
    "allotment_house",
    "parking",
    "bridge",
    "toilets",
    "storage_tank",
    "silo",
    "water_tower",
    "stable",
    "stairs",
    "elevator",
    "gate",
    "city_gate",
    "viaduct",
    "electricity",
    "barn",
    "cowshed",
    "bicycle_parking",
    "gazebo",
    "pavilion",
}
# Thresholds for the landuse heuristic (project assumptions, documented on the methodology page).
ANCILLARY_MAX_M2 = 30.0
EFH_MAX_FOOTPRINT_M2 = 250.0
EFH_MAX_LEVELS = 3


@dataclass(frozen=True)
class Classification:
    category: str
    basis: str  # "osm_tag" | "landuse_heuristic" | "none"


def classify(tags: dict[str, str], footprint_m2: float, levels: float | None, landuse: str | None) -> Classification:
    b = tags.get("building", "yes")
    if b in UNHEATED_TAGS or landuse == "allotments":
        return Classification("unheated", "osm_tag" if b in UNHEATED_TAGS else "landuse_heuristic")
    if b in EFH_TAGS:
        return Classification("EFH", "osm_tag")
    if b in RH_TAGS:
        return Classification("RH", "osm_tag")
    if b in MFH_TAGS:
        return Classification("MFH", "osm_tag")
    if b in NON_RESIDENTIAL_TAGS or "shop" in tags or "amenity" in tags or "office" in tags:
        return Classification("non_residential", "osm_tag")
    if b in GENERIC_TAGS:
        if footprint_m2 < ANCILLARY_MAX_M2:
            return Classification("unheated", "landuse_heuristic")
        if landuse == "residential" or b == "residential":
            small = footprint_m2 < EFH_MAX_FOOTPRINT_M2 and (levels is None or levels <= EFH_MAX_LEVELS)
            return Classification("EFH" if small else "MFH", "landuse_heuristic")
        if landuse in {"commercial", "retail", "industrial"}:
            return Classification("non_residential", "landuse_heuristic")
        return Classification("unknown", "none")
    return Classification("unknown", "none")
