"""Every constant used by the estimates, with where it comes from.

`value=None` means the number has not been pinned yet; build_layers.py refuses to
run while any such value is in use. `verified=False` means the number is taken from
the source but its exact page has not been checked against the original document;
those are listed in data/derived/meta.json and on the methodology page.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass

SOURCES: dict[str, dict[str, str]] = {
    "ifeu_waermeatlas": {
        "title": "ifeu: Modellbeschreibung Wärmeatlas 2.0 (GIS-Modell des Nutzenergiebedarfs), Abschn. 3.2, S. 10",
        "url": "https://www.ifeu.de/fileadmin/uploads/Modellbeschreibung_W%C3%A4rmeatlas_2.0.pdf",
    },
    "iwu_typology_2015": {
        "title": "Loga, T. et al. (2015): Deutsche Wohngebäudetypologie, 2. Aufl., IWU Darmstadt",
        "url": "https://iwu.de/fileadmin/publikationen/gebaeudebestand/episcope/2015_IWU_LogaEtAl_Deutsche-Wohngeb%C3%A4udetypologie.pdf",
    },
    "agora_dach_pv_2023": {
        "title": "greenventory GmbH (2023): Begleitdokumentation zur Analyse 'Solarstrom vom Dach', "
        "v1.1, im Auftrag von Agora Energiewende, S. 7 und Anhang 1 (S. 11)",
        "url": "https://www.agora-energiewende.de/fileadmin/Projekte/2023/2023-16_DE_Dach-PV-Potenzial/2023-16_DE_Dach-PV-Potenzial_Dokumentation.pdf",
    },
    "berlin_umweltatlas_solar": {
        "title": "Umweltatlas Berlin: Solaranlagen 2023 (Studie IP SYSCON 2022), Kartenbeschreibung",
        "url": "https://www.berlin.de/umweltatlas/en/energy/solar-systems/2021/map-description/",
    },
    "leitfaden_waermeplanung_2024": {
        "title": "Ortner, S. et al. (2024): Leitfaden Wärmeplanung, BMWK/BMWSB",
        "url": "https://www.bmwsb.bund.de/SharedDocs/downloads/DE/veroeffentlichungen/wohnen/leitfaden-waermeplanung-lang.pdf?__blob=publicationFile&v=2",
    },
    "berlin_waermeplanung": {
        "title": "SenMVKU Berlin: Inhaltliche Beschreibung der Wärmeplanungsdaten (Geoportal Berlin)",
        "url": "https://gdi.berlin.de/data/waermeplanung/docs/Inhaltliche_Beschreibung_Waermeplanung.pdf",
    },
    "assumption": {"title": "Project assumption (no external source); see methodology", "url": ""},
}


@dataclass(frozen=True)
class Cited:
    value: float | None
    unit: str
    source: str
    note: str = ""
    derived: bool = False  # computed by this project from figures in the source
    verified: bool = True  # page checked against the original document

    def __post_init__(self) -> None:
        if self.source not in SOURCES:
            raise ValueError(f"unknown source {self.source!r}")

    def require(self) -> float:
        if self.value is None:
            raise PendingBenchmark(f"{self.unit} from {self.source} is not pinned yet ({self.note})")
        return self.value


class PendingBenchmark(RuntimeError):
    pass


# --- Geometry -> heated floor area -------------------------------------------------
STOREY_HEIGHT_M = Cited(
    3.0,
    "m",
    "assumption",
    "Within the 2.5–3.0 m storey-height range for which ifeu applies A_N = 0.32·V_e; "
    "Berlin pre-1918 buildings often have higher storeys",
)
AN_PER_VE = Cited(0.32, "1/m", "ifeu_waermeatlas", "A_N = 0.32 m⁻¹ · V_e for storey heights 2.5–3.0 m")

DEFAULT_LEVELS: dict[str, Cited] = {
    "EFH": Cited(2, "floors", "assumption", "used when OSM has neither building:levels nor height"),
    "RH": Cited(2, "floors", "assumption", "used when OSM has neither building:levels nor height"),
    "MFH": Cited(4, "floors", "assumption", "used when OSM has neither building:levels nor height"),
    "other": Cited(2, "floors", "assumption", "used when OSM has neither building:levels nor height"),
}

# --- Specific heat demand (space heating + hot water) -----------------------------
# IWU (2015), Anhang C.3, PDF p. 113: "TABULA Berechnungsverfahren / korrigiert auf Niveau von
# Verbrauchswerten", Referenzklima Deutschland, variant 001 (= existing state, no retrofit).
# Columns used: "Wärmeerzeugung Heizung" and "Wärmeerzeugung Warmwasser", i.e. heat the
# generator must deliver, in kWh per m² *beheizte Wohnfläche* per year. Transcribed by script
# from the PDF text layer; see tests/test_benchmarks.py for the regression check.
AGE_CLASSES = "ABCDEFGHIJ"  # A ≤1859, B 1860–1918, C 1919–48, D 1949–57, E 1958–68, F 1969–78,
#                             G 1979–83, H 1984–94, I 1995–2001, J 2002–09
IWU_HEAT_GENERATION_KWH_M2WF: dict[str, dict[str, tuple[float, float]]] = {
    "EFH": {
        "A": (196.1, 12.5),
        "B": (193.3, 12.9),
        "C": (177.6, 14.4),
        "D": (194.1, 12.8),
        "E": (192.2, 13.0),
        "F": (167.9, 15.1),
        "G": (136.7, 17.7),
        "H": (148.5, 16.8),
        "I": (126.0, 19.8),
        "J": (91.4, 21.4),
    },
    "RH": {
        "B": (169.7, 15.0),
        "C": (150.6, 16.6),
        "D": (166.9, 15.2),
        "E": (121.5, 18.6),
        "F": (140.5, 17.4),
        "G": (140.9, 17.4),
        "H": (113.3, 19.2),
        "I": (91.5, 21.4),
        "J": (82.2, 21.8),
    },
    "MFH": {
        "A": (188.1, 30.5),
        "B": (143.1, 38.6),
        "C": (165.1, 34.9),
        "D": (153.0, 36.6),
        "E": (125.5, 41.5),
        "F": (129.8, 40.9),
        "G": (113.6, 43.2),
        "H": (117.4, 42.7),
        "I": (103.1, 23.4),
        "J": (66.9, 24.9),
    },
    "GMH": {"B": (121.5, 42.1), "C": (140.7, 39.0), "D": (139.0, 39.3), "E": (127.0, 41.3), "F": (113.0, 43.3)},
}
# IWU (2015), Tab. 4, p. 19: Wohnfläche in Mio. m² by type and age class A..J (German stock, Zensus 2011).
IWU_STOCK_LIVING_AREA_MIO_M2: dict[str, list[float]] = {
    "EFH": [46, 135, 150, 116, 218, 233, 110, 178, 158, 119],
    "RH": [19, 62, 82, 52, 76, 79, 45, 85, 80, 52],
    "MFH": [16, 163, 129, 125, 225, 169, 64, 133, 104, 39],
    "GMH": [0.7, 35.8, 7.9, 17.0, 47.1, 86.7, 21.9, 34.8, 25.5, 10.4],
}
# Which IWU types feed each project category (MFH here = IWU MFH + GMH, large apartment blocks).
CATEGORY_TO_IWU_TYPES = {"EFH": ["EFH"], "RH": ["RH"], "MFH": ["MFH", "GMH"]}
WOHNFLAECHE_TO_AN_FACTOR = Cited(
    0.8,
    "factor",
    "iwu_typology_2015",
    "Kap. 5.4, p. 40: values per A_N 'lägen um etwa 20% niedriger' than per beheizte Wohnfläche",
)


def stock_weighted_demand_per_wf(category: str) -> float:
    """Living-area-weighted mean over age classes with a typology value (missing classes are skipped)."""
    num = den = 0.0
    for t in CATEGORY_TO_IWU_TYPES[category]:
        for i, cls in enumerate(AGE_CLASSES):
            if cls in IWU_HEAT_GENERATION_KWH_M2WF[t]:
                w = IWU_STOCK_LIVING_AREA_MIO_M2[t][i]
                num += w * sum(IWU_HEAT_GENERATION_KWH_M2WF[t][cls])
                den += w
    return num / den


SPECIFIC_HEAT_DEMAND: dict[str, Cited] = {
    cat: Cited(
        round(stock_weighted_demand_per_wf(cat) * WOHNFLAECHE_TO_AN_FACTOR.value, 1),
        "kWh/(m² A_N·a)",
        "iwu_typology_2015",
        f"Heat generation for heating + hot water, existing state, calibrated to consumption level; mean of "
        f"IWU types {'+'.join(CATEGORY_TO_IWU_TYPES[cat])} weighted by German living area per age class "
        f"(Tab. 4), converted from Wohnfläche to A_N with factor 0.8",
        derived=True,
    )
    for cat in CATEGORY_TO_IWU_TYPES
}

# --- Rooftop PV (Agora/greenventory 2023 chain) ------------------------------------
ROOF_SLOPE_DEG = {
    "flat": Cited(5, "°", "agora_dach_pv_2023"),
    "pitched": Cited(35, "°", "agora_dach_pv_2023"),
}
USABLE_ROOF_SHARE = {
    "flat": Cited(0.75, "share", "agora_dach_pv_2023"),
    "pitched": Cited(0.60, "share", "agora_dach_pv_2023"),
}
MODULE_AREA_SHARE = {
    "flat": Cited(0.35, "share", "agora_dach_pv_2023", "spacing/safety areas"),
    "pitched": Cited(0.65, "share", "agora_dach_pv_2023", "spacing/safety areas"),
}
MODULE_KWP_PER_M2 = Cited(0.205, "kWp/m²", "agora_dach_pv_2023")
PV_MIN_FOOTPRINT_M2 = Cited(50, "m²", "agora_dach_pv_2023", "unsuitable_too_small_footprint_m2: no PV below this")
PV_SPECIFIC_YIELD = Cited(
    891,
    "kWh/(kWp·a)",
    "berlin_umweltatlas_solar",
    "7,929 GWh/a (text) ÷ 8,894,703 kWp (Tab. 5), Berlin-wide study totals",
    derived=True,
)

# --- Heat-network suitability bands, MWh/(ha·a) ------------------------------------
HEAT_DENSITY_BANDS = [
    {"id": "none", "min": 0, "max": 70, "label": "No technical potential for a heat network"},
    {"id": "new_build", "min": 70, "max": 175, "label": "Heat networks recommended in new-build areas"},
    {"id": "low_temp", "min": 175, "max": 415, "label": "Low-temperature networks in existing stock"},
    {"id": "conventional", "min": 415, "max": 1050, "label": "Benchmark for conventional networks in existing stock"},
    {"id": "very_high", "min": 1050, "max": None, "label": "Very high suitability for heat networks"},
]
HEAT_DENSITY_BANDS_SOURCE = Cited(
    None,
    "MWh/(ha·a)",
    "leitfaden_waermeplanung_2024",
    "Tabelle 11, p. 54; the Leitfaden takes it from Ministerium für Umwelt, Klima und Energiewirtschaft "
    "Baden-Württemberg (2020). Classes refer to final energy (Endenergie)",
)
BERLIN_REFERENCE_THRESHOLD = Cited(
    400,
    "MWh/(ha·a)",
    "berlin_waermeplanung",
    "Berlin's Wärmeplan uses ≥ 400 MWh/(ha·a) for 'Wärmenetzeignung'",
)


def all_cited() -> dict[str, object]:
    """Serialisable snapshot of every constant, for meta.json and the methodology page."""

    def ser(x: object) -> object:
        if isinstance(x, Cited):
            return asdict(x)
        if isinstance(x, dict):
            return {k: ser(v) for k, v in x.items()}
        return x

    return {
        "sources": SOURCES,
        "storey_height": ser(STOREY_HEIGHT_M),
        "an_per_ve": ser(AN_PER_VE),
        "default_levels": ser(DEFAULT_LEVELS),
        "specific_heat_demand": ser(SPECIFIC_HEAT_DEMAND),
        "wohnflaeche_to_an_factor": ser(WOHNFLAECHE_TO_AN_FACTOR),
        "pv_min_footprint_m2": ser(PV_MIN_FOOTPRINT_M2),
        "roof_slope_deg": ser(ROOF_SLOPE_DEG),
        "usable_roof_share": ser(USABLE_ROOF_SHARE),
        "module_area_share": ser(MODULE_AREA_SHARE),
        "module_kwp_per_m2": ser(MODULE_KWP_PER_M2),
        "pv_specific_yield": ser(PV_SPECIFIC_YIELD),
        "heat_density_bands": HEAT_DENSITY_BANDS,
        "heat_density_bands_source": ser(HEAT_DENSITY_BANDS_SOURCE),
        "berlin_reference_threshold": ser(BERLIN_REFERENCE_THRESHOLD),
    }
