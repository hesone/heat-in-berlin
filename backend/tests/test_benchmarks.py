import pytest

from waerme import benchmarks as bm


def test_transcribed_iwu_rows_spot_check():
    # Values read off IWU 2015 Anhang C.3 p. 113 (variant 001, calibrated to consumption level)
    assert bm.IWU_HEAT_GENERATION_KWH_M2WF["MFH"]["B"] == (143.1, 38.6)
    assert bm.IWU_HEAT_GENERATION_KWH_M2WF["GMH"]["C"] == (140.7, 39.0)
    assert bm.IWU_HEAT_GENERATION_KWH_M2WF["EFH"]["J"] == (91.4, 21.4)


def test_stock_table_sums_match_iwu_tab4_totals():
    # Tab. 4 "Summe" column: EFH 1.463, RH 633, MFH 1.168, GMH 288 Mio. m²
    sums = {k: sum(v) for k, v in bm.IWU_STOCK_LIVING_AREA_MIO_M2.items()}
    assert sums["EFH"] == pytest.approx(1463, abs=1)
    assert sums["RH"] == pytest.approx(633, abs=1)
    assert sums["MFH"] == pytest.approx(1168, abs=1)
    assert sums["GMH"] == pytest.approx(288, abs=1)


def test_pinned_specific_demand_values():
    # Regression guard: changes here mean the method or transcription changed.
    assert bm.SPECIFIC_HEAT_DEMAND["EFH"].value == 142.4
    assert bm.SPECIFIC_HEAT_DEMAND["RH"].value == 118.2
    assert bm.SPECIFIC_HEAT_DEMAND["MFH"].value == 134.5


def test_weighted_mean_skips_classes_without_typology_value():
    # RH has no age class A in the typology, so its weight (19) must not enter the mean
    expected_den = sum(bm.IWU_STOCK_LIVING_AREA_MIO_M2["RH"][1:])
    num = sum(
        bm.IWU_STOCK_LIVING_AREA_MIO_M2["RH"][i] * sum(bm.IWU_HEAT_GENERATION_KWH_M2WF["RH"][c])
        for i, c in enumerate(bm.AGE_CLASSES)
        if c in bm.IWU_HEAT_GENERATION_KWH_M2WF["RH"]
    )
    assert bm.stock_weighted_demand_per_wf("RH") == pytest.approx(num / expected_den)


def test_no_value_left_pending():
    def walk(x):
        if isinstance(x, bm.Cited):
            yield x
        elif isinstance(x, dict):
            for v in x.values():
                yield from walk(v)

    pending = [c for name in dir(bm) for c in walk(getattr(bm, name)) if c.value is None and c.unit != "MWh/(ha·a)"]
    assert pending == []
