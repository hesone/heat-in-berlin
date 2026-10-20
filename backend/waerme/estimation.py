"""Per-building estimates. Pure functions; every constant comes from waerme.benchmarks."""

from __future__ import annotations

import math
import re
from dataclasses import dataclass

from . import benchmarks as bm

RESIDENTIAL = {"EFH", "RH", "MFH"}
PITCHED_SHAPES = {
    "gabled",
    "hipped",
    "half-hipped",
    "pyramidal",
    "mansard",
    "gambrel",
    "skillion",
    "saltbox",
    "gabled_row",
    "side_hipped",
    "round",
    "dome",
    "onion",
    "cone",
    "crosspitched",
}
_NUM = re.compile(r"\d+(?:[.,]\d+)?")


def _first_number(raw: str | None) -> float | None:
    if not raw:
        return None
    m = _NUM.search(raw)
    return float(m.group().replace(",", ".")) if m else None


def parse_levels(tags: dict[str, str]) -> tuple[float | None, str]:
    """Above-ground floors from OSM. Returns (levels, source) with source in
    {"osm:building:levels", "osm:height", "none"}."""
    lv = _first_number(tags.get("building:levels"))
    if lv is not None and 1 <= lv <= 40:
        return lv, "osm:building:levels"
    h = _first_number(tags.get("height"))
    if h is not None and 2 <= h <= 150:
        return max(1.0, round(h / bm.STOREY_HEIGHT_M.require())), "osm:height"
    return None, "none"


def resolve_levels(tags: dict[str, str], category: str) -> tuple[float, str]:
    levels, source = parse_levels(tags)
    if levels is not None:
        return levels, source
    key = category if category in bm.DEFAULT_LEVELS else "other"
    return bm.DEFAULT_LEVELS[key].require(), "default"


def roof_kind(tags: dict[str, str], category: str) -> tuple[str, str]:
    shape = tags.get("roof:shape")
    if shape == "flat":
        return "flat", "osm:roof:shape"
    if shape in PITCHED_SHAPES:
        return "pitched", "osm:roof:shape"
    return ("pitched" if category in {"EFH", "RH"} else "flat"), "default"


def heat_reference_area_m2(footprint_m2: float, levels: float) -> float:
    """A_N = 0.32 · V_e, with V_e approximated as footprint · floors · storey height."""
    v_e = footprint_m2 * levels * bm.STOREY_HEIGHT_M.require()
    return bm.AN_PER_VE.require() * v_e


def heat_demand_kwh_a(category: str, a_n_m2: float) -> float | None:
    if category not in RESIDENTIAL:
        return None
    return a_n_m2 * bm.SPECIFIC_HEAT_DEMAND[category].require()


def pv_kwp(footprint_m2: float, kind: str) -> float:
    """Agora/greenventory (2023) chain: footprint → roof → usable → module area → kWp.
    Footprints below the study's minimum size get 0 kWp."""
    if footprint_m2 < bm.PV_MIN_FOOTPRINT_M2.require():
        return 0.0
    roof = footprint_m2 / math.cos(math.radians(bm.ROOF_SLOPE_DEG[kind].require()))
    module_area = roof * bm.USABLE_ROOF_SHARE[kind].require() * bm.MODULE_AREA_SHARE[kind].require()
    return module_area * bm.MODULE_KWP_PER_M2.require()


def pv_kwh_a(kwp: float) -> float:
    return kwp * bm.PV_SPECIFIC_YIELD.require()


@dataclass(frozen=True)
class Estimate:
    footprint_m2: float
    levels: float
    levels_source: str
    a_n_m2: float
    heat_kwh_a: float | None
    specific_heat_kwh_m2a: float | None
    roof: str
    roof_source: str
    pv_kwp: float
    pv_kwh_a: float


def estimate(tags: dict[str, str], category: str, footprint_m2: float, with_heat: bool = True) -> Estimate:
    """with_heat=False leaves heat fields empty (used only while IWU values are pending)."""
    levels, lsrc = resolve_levels(tags, category)
    a_n = heat_reference_area_m2(footprint_m2, levels)
    residential = with_heat and category in RESIDENTIAL
    heat = heat_demand_kwh_a(category, a_n) if residential else None
    spec = bm.SPECIFIC_HEAT_DEMAND[category].require() if residential else None
    kind, rsrc = roof_kind(tags, category)
    kwp = pv_kwp(footprint_m2, kind)
    return Estimate(footprint_m2, levels, lsrc, a_n, heat, spec, kind, rsrc, kwp, pv_kwh_a(kwp))
