import pytest
from shapely.geometry import box, mapping

from waerme.analysis import AnalysisError, BuildingIndex, analyse, band_for, parse_polygon
from waerme.pipeline import build

from .conftest import LAT0, LON0


@pytest.fixture
def layers(synthetic_doc, test_heat_benchmarks):
    return build(synthetic_doc, "Testdorf")


def test_build_drops_unheated_and_neighbours(layers):
    buildings, _, meta = layers
    osm_ids = {f["properties"]["osm"] for f in buildings["features"]}
    assert "w12" not in osm_ids  # garage
    assert "w16" not in osm_ids  # outside boundary
    assert meta["category_counts"] == {"MFH": 2, "EFH": 1, "unheated": 1, "non_residential": 1, "unknown": 1}
    assert meta["features_rendered"] == 5
    cats = {f["properties"]["osm"]: f["properties"]["cat"] for f in buildings["features"]}
    assert cats["w14"] == "MFH"  # building=yes inside residential landuse, ~650 m² footprint
    assert cats["w15"] == "unknown"


def test_non_residential_has_pv_but_no_heat(layers):
    school = next(f for f in layers[0]["features"] if f["properties"]["osm"] == "w13")["properties"]
    assert school["heat_kwh_a"] is None and school["pv_kwp"] > 0


def test_hexagons_conserve_totals(layers):
    buildings, hexes, _ = layers
    b_heat = sum(f["properties"]["heat_kwh_a"] or 0 for f in buildings["features"]) / 1000
    h_heat = sum(f["properties"]["heat_mwh_a"] for f in hexes["features"])
    assert h_heat == pytest.approx(b_heat, abs=0.5)
    assert sum(f["properties"]["buildings"] for f in hexes["features"]) == len(buildings["features"])


@pytest.mark.parametrize(
    "density,band",
    [
        (0, "none"),
        (69.9, "none"),
        (70, "new_build"),
        (174.9, "new_build"),
        (175, "low_temp"),
        (415, "conventional"),
        (1049.9, "conventional"),
        (1050, "very_high"),
        (99999, "very_high"),
    ],
)
def test_band_edges_lower_inclusive(density, band):
    assert band_for(density)["id"] == band


def test_analyse_counts_by_centroid(layers):
    index = BuildingIndex.from_features(layers[0]["features"])
    # box covering only w10 (apartments) and w11 (house)
    poly = box(LON0 + 0.0005, LAT0 + 0.0005, LON0 + 0.0025, LAT0 + 0.0015)
    r = analyse(poly, index)
    assert r["buildings"] == 2 and r["buildings_with_heat_estimate"] == 2
    expected = (
        sum(f["properties"]["heat_kwh_a"] for f in layers[0]["features"] if f["properties"]["osm"] in {"w10", "w11"})
        / 1000
    )
    assert r["heat_mwh_a"] == pytest.approx(expected, abs=0.1)
    assert r["heat_density_mwh_ha_a"] == pytest.approx(r["heat_mwh_a"] / r["area_ha"], rel=0.01)
    assert r["indicative"] is True


def test_analyse_reports_buildings_without_estimate(layers):
    index = BuildingIndex.from_features(layers[0]["features"])
    r = analyse(box(LON0, LAT0, LON0 + 0.01, LAT0 + 0.01), index)
    assert r["buildings"] == 5 and r["buildings_without_heat_estimate"] == 2


@pytest.mark.parametrize(
    "geojson",
    [
        {"type": "Point", "coordinates": [13.29, 52.47]},
        {"type": "Polygon", "coordinates": [[[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]]]},  # bow-tie
        {"type": "Polygon", "coordinates": "nope"},
    ],
)
def test_parse_polygon_rejects_bad_input(geojson):
    with pytest.raises(AnalysisError):
        parse_polygon(geojson)


def test_analyse_rejects_huge_area(layers):
    index = BuildingIndex.from_features(layers[0]["features"])
    with pytest.raises(AnalysisError):
        analyse(parse_polygon(mapping(box(13.0, 52.3, 13.8, 52.7))), index)


def test_pending_heat_values_block_build_unless_allowed(synthetic_doc, monkeypatch):
    from waerme import benchmarks as bm

    pending = {k: bm.Cited(None, "kWh/(m²·a)", "iwu_typology_2015") for k in ("EFH", "RH", "MFH")}
    monkeypatch.setattr(bm, "SPECIFIC_HEAT_DEMAND", pending)
    with pytest.raises(bm.PendingBenchmark):
        build(synthetic_doc, "Testdorf")
    buildings, _, meta = build(synthetic_doc, "Testdorf", allow_pending=True)
    assert all(f["properties"]["heat_kwh_a"] is None for f in buildings["features"])
    assert meta["heat_estimates_pending"] is True and meta["with_heat_estimate"] == 0
