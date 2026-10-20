import math

import pytest

from waerme import benchmarks as bm
from waerme import estimation as e


@pytest.mark.parametrize(
    "tags,expected",
    [
        ({"building:levels": "4"}, (4.0, "osm:building:levels")),
        ({"building:levels": "3,5"}, (3.5, "osm:building:levels")),
        ({"building:levels": "4;5"}, (4.0, "osm:building:levels")),
        ({"building:levels": "0", "height": "12 m"}, (4.0, "osm:height")),
        ({"height": "7.4"}, (2.0, "osm:height")),
        ({"building:levels": "abc"}, (None, "none")),
        ({}, (None, "none")),
    ],
)
def test_parse_levels(tags, expected):
    assert e.parse_levels(tags) == expected


def test_resolve_levels_falls_back_to_type_default():
    assert e.resolve_levels({}, "MFH") == (bm.DEFAULT_LEVELS["MFH"].value, "default")
    assert e.resolve_levels({}, "non_residential") == (bm.DEFAULT_LEVELS["other"].value, "default")


def test_roof_kind():
    assert e.roof_kind({"roof:shape": "flat"}, "EFH") == ("flat", "osm:roof:shape")
    assert e.roof_kind({"roof:shape": "hipped"}, "MFH") == ("pitched", "osm:roof:shape")
    assert e.roof_kind({}, "EFH") == ("pitched", "default")
    assert e.roof_kind({}, "MFH") == ("flat", "default")


def test_heat_reference_area_is_0_32_times_gross_volume():
    # 100 m² footprint x 4 floors x 3.0 m = 1200 m³ ; x 0.32 = 384 m²
    assert e.heat_reference_area_m2(100, 4) == pytest.approx(384.0)


def test_heat_demand_only_for_residential(test_heat_benchmarks):
    assert e.heat_demand_kwh_a("MFH", 384) == pytest.approx(38_400)
    assert e.heat_demand_kwh_a("non_residential", 384) is None
    assert e.heat_demand_kwh_a("unknown", 384) is None


def test_pending_benchmark_blocks_estimate(monkeypatch):
    monkeypatch.setattr(bm, "SPECIFIC_HEAT_DEMAND", {"MFH": bm.Cited(None, "kWh/(m²·a)", "iwu_typology_2015")})
    with pytest.raises(bm.PendingBenchmark):
        e.heat_demand_kwh_a("MFH", 100)


def test_pv_chain_matches_agora_factors():
    flat = 100 / math.cos(math.radians(5)) * 0.75 * 0.35 * 0.205
    pitched = 100 / math.cos(math.radians(35)) * 0.60 * 0.65 * 0.205
    assert e.pv_kwp(100, "flat") == pytest.approx(flat)
    assert e.pv_kwp(100, "pitched") == pytest.approx(pitched)
    assert e.pv_kwh_a(10) == pytest.approx(10 * 891)


def test_pv_zero_below_minimum_footprint():
    assert e.pv_kwp(49.9, "flat") == 0.0
    assert e.pv_kwp(50, "flat") > 0


def test_estimate_bundles_everything(test_heat_benchmarks):
    est = e.estimate({"building:levels": "5", "roof:shape": "flat"}, "MFH", 200)
    assert est.levels_source == "osm:building:levels"
    assert est.a_n_m2 == pytest.approx(200 * 5 * 3.0 * 0.32)
    assert est.heat_kwh_a == pytest.approx(est.a_n_m2 * 100)
    assert est.roof == "flat"


def test_cited_rejects_unknown_source():
    with pytest.raises(ValueError):
        bm.Cited(1, "x", "made_up_source")
