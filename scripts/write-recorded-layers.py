#!/usr/bin/env python3
"""Write the recorded layer JSON, views, snapshots, manifest, and source list.

Numbers for night lights and the SST snapshot come from files fetched on 2026-11-13.
Sample layers stay sample:true and are not measurements.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
RECORDED = ROOT / "pipeline/tests/fixtures/recorded"
RECORDED_RETRIEVED = "2026-11-13"

sys.path.insert(0, str(ROOT / "pipeline"))

from earth_pipeline.clean import annual_co2, gistemp_annual, september_ice  # noqa: E402

NIGHT_2012 = {
    "global": 12.1298,
    "egypt": 38.6884,
    "africa": 18.5286,
    "arctic": 17.2753,
    "europe": 16.0756,
    "asia": 15.8362,
    "americas": 9.4969,
    "oceania": 9.6532,
}
NIGHT_2016 = {
    "global": 12.1857,
    "egypt": 38.5287,
    "africa": 18.6335,
    "arctic": 17.2506,
    "europe": 15.7698,
    "asia": 16.2455,
    "americas": 9.4701,
    "oceania": 9.6831,
}
REGIONS = list(NIGHT_2012)
SHA_2012 = "f37dd51adccbf247c7ecbfd8f0ee8eec02dfa96e04cbe6da72b88cb862a86f4c"
SHA_2016 = "663523926f9c2df360e96799e7a3dcc9407d9ac387f84add14df173781c8855f"
RETRIEVED = "2026-11-13T11:20:00Z"


def points(year_values: list[tuple[int, float | None]]):
    return [{"t": year, "v": value, "q": "ok" if value is not None else "missing"} for year, value in year_values]


def series_from(table: dict[str, float], other: dict[str, float]):
    return {region: points([(2012, table[region]), (2016, other[region])]) for region in REGIONS}


def write(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n"
    )


def sha256_of(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def recorded_points(rows: list[dict], key: str, last_year: int | None = None) -> list[dict]:
    out = []
    for row in rows:
        year = int(row["year"])
        value = row.get(key)
        if last_year is not None and year > last_year:
            continue
        if value is None:
            continue
        out.append({"t": year, "v": float(value), "q": "ok"})
    if not out:
        raise SystemExit(f"no recorded values for {key}")
    return out


def stand_in_frames(layer_id: str) -> list[dict]:
    """The SAMPLE frames stay as marked stand-ins beside a real series."""
    path = PUBLIC / f"data/layers/{layer_id}.sample.json"
    frames = json.loads(path.read_text(encoding="utf-8"))["frames"]
    return [{**frame, "sample": True} for frame in frames]


def write_recorded_layers() -> None:
    temp_csv = RECORDED / "gistemp-2026-11-13.csv"
    co2_csv = RECORDED / "co2_mm_mlo-2026-11-13.csv"
    ice_csv = RECORDED / "nsidc-sept-2026-11-13.csv"

    temp = recorded_points(gistemp_annual(temp_csv.read_text(encoding="utf-8")), "value")
    co2 = recorded_points(
        annual_co2(co2_csv.read_text(encoding="utf-8")), "value", last_year=2025
    )
    ice = recorded_points(september_ice(ice_csv.read_text(encoding="utf-8")), "extent")

    specs = [
        {
            "id": "temperature",
            "series": {"global": temp},
            "source": {
                "name": "NASA GISTEMP v4",
                "dataset_url": "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv",
                "eic_page": "https://earth.gov/sealevel/vital-signs/global-temperature/",
                "retrieved": RECORDED_RETRIEVED,
                "sha256": sha256_of(temp_csv),
                "citation": "GISTEMP Team, 2026: GISS Surface Temperature Analysis (GISTEMP), version 4. NASA Goddard Institute for Space Studies.",
                "ack": None,
            },
            "description": {
                "en": "GISTEMP v4 annual global mean surface-temperature anomaly, °C relative to 1951–1980. The source is global only, so no regional series exists. Globe map frames are marked stand-ins, not GISTEMP frames.",
                "ar": "شذوذ متوسط درجة حرارة سطح الأرض السنوي من GISTEMP v4، بالدرجة المئوية مقارنة بـ 1951–1980. المصدر عالمي فقط، فلا توجد سلسلة إقليمية. إطارات الخريطة على الكرة مولّدة وليست إطارات GISTEMP.",
            },
        },
        {
            "id": "co2",
            "series": {"global": co2},
            "source": {
                "name": "NOAA GML Mauna Loa CO2",
                "dataset_url": "https://gml.noaa.gov/aftp/products/trends/co2/co2_mm_mlo.csv",
                "eic_page": "https://earth.gov/sealevel/vital-signs/carbon-dioxide/",
                "retrieved": RECORDED_RETRIEVED,
                "sha256": sha256_of(co2_csv),
                "citation": "Lan, Tans, and Thoning, NOAA Global Monitoring Laboratory, Mauna Loa CO2 monthly mean data.",
                "ack": None,
            },
            "description": {
                "en": "Annual means of the NOAA GML Mauna Loa monthly CO2 record, 1958–2025. Complete calendar years only; 2026 is incomplete and is not filled. Globe map frames are marked stand-ins.",
                "ar": "متوسطات سنوية لسجل ثاني أكسيد الكربون الشهري من ماونا لوا التابع لـ NOAA GML، من 1958 إلى 2025. السنوات الكاملة فقط؛ 2026 ناقصة ولا تُملأ. إطارات الخريطة مولّدة.",
            },
        },
        {
            "id": "sea_ice",
            "series": {"arctic": ice},
            "source": {
                "name": "NSIDC Sea Ice Index v4",
                "dataset_url": "https://noaadata.apps.nsidc.org/NOAA/G02135/north/monthly/data/N_09_extent_v4.0.csv",
                "eic_page": "https://nsidc.org/data/g02135/versions/4",
                "retrieved": RECORDED_RETRIEVED,
                "sha256": sha256_of(ice_csv),
                "citation": "Fetterer et al., Sea Ice Index, G02135, version 4. NSIDC: National Snow and Ice Data Center.",
                "ack": None,
            },
            "description": {
                "en": "NSIDC Sea Ice Index v4 September Arctic extent, 1979–2026, in million km². Arctic only: the September series does not cover other regions. Globe map frames are marked stand-ins.",
                "ar": "امتداد الجليد البحري في القطب الشمالي لشهر سبتمبر من NSIDC v4، من 1979 إلى 2026، بملايين الكيلومترات المربعة. القطب الشمالي فقط. إطارات الخريطة مولّدة.",
            },
        },
    ]

    for spec in specs:
        layer_id = spec["id"]
        config = json.loads(
            (PUBLIC / f"data/layers/{layer_id}.config.json").read_text(encoding="utf-8")
        )
        points = next(iter(spec["series"].values()))
        write(
            PUBLIC / f"data/layers/{layer_id}.json",
            {
                "id": layer_id,
                "sample": False,
                "title": config["title"],
                "unit": config["unit"],
                "source": spec["source"],
                "range": {"min": points[0]["t"], "max": points[-1]["t"]},
                "series": spec["series"],
                "annual": None,
                "cells": None,
                "seasonalAmplitude": None,
                "frames": stand_in_frames(layer_id),
                "events": [],
                "description": spec["description"],
            },
        )


def config(layer_id: str, category: str, title_en: str, title_ar: str, unit_en: str, unit_ar: str, time_kind: str, page: str, frames: str, lo: float, hi: float, timbre: str, register: list[int], sym: list[int], scale: str, role: str, start: int, end: int, field_fast: str = "delta(v)", fast: list[float] | None = None, species: dict | None = None):
    what = {"timbre": timbre, "register": register, "symphonyRegister": sym}
    if species:
        what["timbreBySpecies"] = species
    return {
        "id": layer_id,
        "category": category,
        "title": {"en": title_en, "ar": title_ar},
        "unit": {"en": unit_en, "ar": unit_ar},
        "timeKind": time_kind,
        "eic": {"page": page, "frames": frames},
        "variables": {
            "how_much": {"field": "v", "range": [lo, hi]},
            "how_strong": {"field": "abs(v)", "range": [0, max(abs(lo), abs(hi))]},
            "how_fast": {"field": field_fast, "range": fast or [-1, 1]},
            "where": {"field": "region_center"},
        },
        "what": what,
        "scale": scale,
        "regions": REGIONS,
        "symphony": {"role": role, "from": start, "to": end},
    }


def sample_series(values: list[tuple[int, float]]):
    return {region: points(values) for region in REGIONS}


def main() -> None:
    write_recorded_layers()
    label = "night brightness index (image-derived, not calibrated radiance)"
    write(
        PUBLIC / "data/layers/night_lights.config.json",
        config(
            "night_lights",
            "human",
            "Night lights",
            "أضواء الليل",
            label,
            "مؤشر سطوع ليلي (مشتق من الصورة، ليس إشعاعًا معايرًا)",
            "year",
            "https://svs.gsfc.nasa.gov/5313/",
            "/textures",
            5.51,
            51.75,
            "night-bell",
            [52, 88],
            [60, 84],
            "maqam_hijaz",
            "bell",
            2012,
            2016,
            fast=[-10, 10],
        ),
    )
    write(
        PUBLIC / "data/layers/night_lights.json",
        {
            "id": "night_lights",
            "sample": False,
            "title": {"en": "Night lights", "ar": "أضواء الليل"},
            "unit": {"en": label, "ar": "مؤشر سطوع ليلي (مشتق من الصورة، ليس إشعاعًا معايرًا)"},
            "source": [
                {
                    "name": "NASA GIBS VIIRS Black Marble 2012",
                    "dataset_url": "https://gibs.earthdata.nasa.gov/",
                    "eic_page": "https://svs.gsfc.nasa.gov/5313/",
                    "retrieved": RETRIEVED,
                    "sha256": SHA_2012,
                    "citation": "NASA Earth Observatory / Black Marble (Suomi NPP VIIRS), Miguel Román, NASA GSFC; NASA GIBS",
                    "ack": "NASA Earth Observatory images by Joshua Stevens, using Suomi NPP VIIRS data from Miguel Román, NASA GSFC.",
                    "gibs_layer": "VIIRS_Black_Marble",
                },
                {
                    "name": "NASA GIBS VIIRS Black Marble 2016",
                    "dataset_url": "https://gibs.earthdata.nasa.gov/",
                    "eic_page": "https://svs.gsfc.nasa.gov/5475/",
                    "retrieved": RETRIEVED,
                    "sha256": SHA_2016,
                    "citation": "NASA Earth Observatory / Black Marble (Suomi NPP VIIRS), Miguel Román, NASA GSFC; NASA GIBS",
                    "ack": "NASA Earth Observatory images by Joshua Stevens, using Suomi NPP VIIRS data from Miguel Román, NASA GSFC.",
                    "gibs_layer": "VIIRS_Black_Marble",
                },
            ],
            "range": {"min": 5.51, "max": 51.75},
            "series": series_from(NIGHT_2012, NIGHT_2016),
            "annual": None,
            "cells": None,
            "seasonalAmplitude": None,
            "frames": [
                {"t": 2012, "src": "/textures/earth-night-2012.webp", "q": "ok", "sample": False},
                {"t": 2016, "src": "/textures/earth-night.webp", "q": "ok", "sample": False},
            ],
            "events": [],
            "description": {
                "en": "Cosine-weighted luma of the GIBS Black Marble PNG at 1024×512. This is a night brightness index (image-derived, not calibrated radiance). Range 5.51–51.75 is the 2016 image p5–p95.",
                "ar": "لمعان موزون بجيب التمام لصورة الرخام الأسود من GIBS. مؤشر سطوع ليلي مشتق من الصورة، وليس إشعاعًا معايرًا.",
            },
        },
    )

    specs = [
        ("ocean_sst", "ocean", "Ocean temperature", "حرارة المحيط", "°C", "°C", "year", "https://svs.gsfc.nasa.gov/3912/", "/frames/ocean_sst", -2, 32, "water-fm", [48, 84], [55, 72], "maqam_hijaz", "pad", 2003, 2025, [(2003, 18.0), (2014, 18.4), (2025, 19.1)]),
        ("ocean_currents", "ocean", "Ocean currents", "تيارات المحيط", "frame step", "خطوة إطار", "year", "https://svs.gsfc.nasa.gov/3912/", "/frames/ocean_currents", 0, 1, "water-fm", [40, 64], [40, 60], "maqam_nahawand", "bed", 2007, 2008, [(2007, 0.2), (2008, 0.4)]),
        ("aerosols", "atmosphere", "Aerosols", "الهباء الجوي", "AOD", "AOD", "year", "https://svs.gsfc.nasa.gov/5669/", "/frames/aerosols", 0, 5, "grain-pad", [55, 86], [60, 84], "maqam_rast", "texture", 1980, 2026, [(1980, 0.12), (2000, 0.16), (2025, 0.21)]),
        ("air_quality", "atmosphere", "Air quality", "جودة الهواء", "µg/m³", "µg/m³", "year", "https://svs.gsfc.nasa.gov/5533/", "/frames/air_quality", 0, 75, "aq-chord", [52, 84], [55, 79], "maqam_bayati", "chord", 2024, 2026, [(2024, 18), (2025, 16), (2026, 15)]),
        ("lightning", "weather", "Lightning", "البرق", "flash-rate index", "مؤشر معدل الوميض", "year", "https://svs.gsfc.nasa.gov/5011/", "/frames/lightning", 0, 1, "thunder-perc", [72, 96], [84, 96], "chromatic", "percussion", 2017, 2021, [(2017, 0.2), (2019, 0.35), (2021, 0.28)]),
    ]
    for spec in specs:
        layer_id, category, en, ar, unit, unit_ar, kind, page, frames, lo, hi, timbre, reg, sym, scale, role, start, end, values = spec
        payload = config(layer_id, category, en, ar, unit, unit_ar, kind, page, frames, lo, hi, timbre, reg, sym, scale, role, start, end)
        if layer_id == "aerosols":
            payload["what"]["timbreBySpecies"] = {
                "sea_salt": "air-flute",
                "dust": "grain-pad",
                "smoke": "low-brass",
                "sulfate": "glass-bells",
            }
        write(PUBLIC / f"data/layers/{layer_id}.config.json", payload)
        write(
            PUBLIC / f"data/layers/{layer_id}.sample.json",
            {
                "id": layer_id,
                "sample": True,
                "title": {"en": en, "ar": ar},
                "unit": {"en": unit, "ar": unit_ar},
                "source": {
                    "name": f"SAMPLE {en}",
                    "dataset_url": page,
                    "eic_page": page,
                    "retrieved": None,
                    "sha256": None,
                    "citation": "SAMPLE. Not a measurement.",
                    "ack": None,
                },
                "range": {"min": lo, "max": hi},
                "series": sample_series(values),
                "annual": None,
                "cells": None,
                "seasonalAmplitude": None,
                "frames": [{"t": values[-1][0], "src": "/frames/temperature/2025.webp", "q": "ok", "sample": True}],
                "events": [],
                "description": {
                    "en": f"SAMPLE {en}. Not a measurement. The globe may still show a real NASA texture beside this series.",
                    "ar": f"بيانات تجريبية لـ {ar}. ليست قياسًا.",
                },
            },
        )

    def view(layer_id, base, cameras, credit, overlay=None, before=None, night=True, height=True, note=""):
        body = {
            "id": layer_id,
            "base": base,
            "baseDim": 0,
            "night": night,
            "height": {
                "src": "/textures/earth-height.png",
                "offset": -10900,
                "scale": 19700,
                "exaggeration": 0.012,
            }
            if height
            else None,
            "overlay": overlay,
            "cameras": cameras,
            "beforeAfter": before,
            "transitionMs": 900,
            "credit": credit,
        }
        if note:
            body["note"] = note
        return body

    cairo = {"id": "cairo", "label": {"en": "Cairo", "ar": "القاهرة"}, "lat": 30.0, "lon": 31.2, "alt": 1.6}
    nile = {"id": "nile", "label": {"en": "Nile", "ar": "النيل"}, "lat": 30, "lon": 31, "alt": 1.9}
    gulf = {"id": "gulf-stream", "label": {"en": "Gulf Stream", "ar": "تيار الخليج"}, "lat": 35, "lon": -65, "alt": 2.0}
    africa = {"id": "africa", "label": {"en": "Africa", "ar": "أفريقيا"}, "lat": 20, "lon": 31, "alt": 2.8}
    maracaibo = {"id": "maracaibo", "label": {"en": "Lake Maracaibo", "ar": "بحيرة ماراكيبو"}, "lat": 9.8, "lon": -71.6, "alt": 2.2}
    dust = {"id": "sahara", "label": {"en": "Saharan dust", "ar": "غبار الصحراء"}, "lat": 15, "lon": -20, "alt": 2.5}
    gibs = "We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS)."
    bmng = "NASA Earth Observatory, Blue Marble NG by Reto Stöckli (NASA GSFC); served by NASA GIBS."
    etopo = "NOAA National Centers for Environmental Information. 2022: ETOPO 2022 Global Relief Model."
    write(PUBLIC / "data/views/home.view.json", view("home", "earth-day", [africa], [bmng, etopo, gibs]))
    write(
        PUBLIC / "data/views/night_lights.view.json",
        view(
            "night_lights",
            "earth-night",
            [nile, {"id": "india", "label": {"en": "India", "ar": "الهند"}, "lat": 22, "lon": 79, "alt": 1.9}],
            ["NASA Earth Observatory images by Joshua Stevens, using Suomi NPP VIIRS data from Miguel Román, NASA GSFC.", gibs, etopo],
            before={"a": 2012, "b": 2016, "mode": "wipe"},
            note="night brightness index (image-derived, not calibrated radiance)",
        ),
    )
    ramp = {
        "id": "sst",
        "src": "/ramps/sst.png",
        "domain": [-2, 32],
        "unit": {"en": "°C", "ar": "°C"},
        "kind": "sequential",
        "source": "https://gibs.earthdata.nasa.gov/colormaps/v1.3/GHRSST_Sea_Surface_Temperature.xml",
    }
    write(
        PUBLIC / "data/views/ocean_sst.view.json",
        view(
            "ocean_sst",
            "earth-relief-bathy",
            [gulf],
            ["JPL MUR MEaSUREs Project. GHRSST Level 4 MUR Global Foundation Sea Surface Temperature Analysis, v4.1. PO.DAAC.", gibs, etopo],
            overlay={"kind": "value", "mask": "water", "src": "/frames/ocean_sst/2024-08-15.value.png", "ramp": ramp, "opacity": 0.85},
            before={"a": 2003, "b": 2025, "mode": "toggle"},
            note="The 15 Aug 2024 frame is a real GIBS decode. The multi-year series in the sample file is not.",
        ),
    )
    write(PUBLIC / "data/views/ocean_currents.view.json", view("ocean_currents", "earth-relief-bathy", [gulf], ["NASA/GSFC Scientific Visualization Studio; ECCO2 (MIT/JPL).", gibs, etopo], note="No numeric speeds are invented from the frames."))
    write(PUBLIC / "data/views/aerosols.view.json", view("aerosols", "earth-day", [dust], ["NASA Global Modeling and Assimilation Office (GMAO).", gibs], height=False, night=False))
    write(PUBLIC / "data/views/air_quality.view.json", view("air_quality", "earth-day", [cairo], ["NASA GMAO GEOS-CF.", "Contains modified Copernicus Atmosphere Monitoring Service information", gibs], height=False, night=False))
    write(
        PUBLIC / "data/views/lightning.view.json",
        view(
            "lightning",
            "earth-night",
            [maracaibo],
            ["Blakeslee, R. J. (2020), ISS LIS science data, NASA GHRC DAAC.", gibs],
            note="Seasonal set: 18 windows from MAM 2017 to JJA 2021. Each is a 10-day mid-season sum. Missing days are not filled. Historical only.",
        ),
    )

    registry = json.loads((PUBLIC / "data/registry.json").read_text())
    extras = [
        ("night_lights", "/data/layers/night_lights.json", False, "gibs-grid"),
        ("ocean_sst", "/data/layers/ocean_sst.sample.json", False, "gibs-grid"),
        ("ocean_currents", "/data/layers/ocean_currents.sample.json", True, None),
        ("aerosols", "/data/layers/aerosols.sample.json", True, None),
        ("air_quality", "/data/layers/air_quality.sample.json", False, "open-meteo-aq"),
        ("lightning", "/data/layers/lightning.sample.json", True, None),
    ]
    existing = {layer["id"]: layer for layer in registry["layers"]}
    for layer_id, data, historical, feed in extras:
        entry = {
            "id": layer_id,
            "config": f"/data/layers/{layer_id}.config.json",
            "data": data,
            "view": f"/data/views/{layer_id}.view.json",
            "historicalOnly": historical,
            "sources": [layer_id],
        }
        if feed:
            entry["live"] = {"feed": feed, "revalidate": 21600 if feed == "gibs-grid" else 3600}
        existing[layer_id] = entry
    # live feeds for the original four, without pretending their sample series is live
    existing["temperature"]["live"] = {"feed": "gistemp", "revalidate": 604800}
    existing["temperature"]["historicalOnly"] = False
    existing["co2"]["live"] = {"feed": "noaa-gml", "revalidate": 86400}
    existing["sea_ice"]["live"] = {"feed": "nsidc", "revalidate": 86400}
    for layer_id in ("temperature", "co2", "sea_ice"):
        existing[layer_id]["data"] = f"/data/layers/{layer_id}.json"
    existing["wildfire"]["live"] = {"feed": "firms-24h", "revalidate": 1800}
    order = ["temperature", "wildfire", "sea_ice", "co2", "night_lights", "ocean_sst", "ocean_currents", "aerosols", "air_quality", "lightning"]
    registry["layers"] = [existing[layer_id] for layer_id in order]
    write(PUBLIC / "data/registry.json", registry)

    def snap(feed, status, data_time, source, license_name, url, note, items):
        body = {
            "feed": feed,
            "status": status,
            "dataTime": data_time,
            "fetchedAt": RETRIEVED,
            "source": {"name": source, "url": url, "license": license_name},
            "latencyNote": note,
            "snapshotId": hashlib.sha256(json.dumps(items, sort_keys=True).encode()).hexdigest()[:16],
            "items": items,
        }
        write(PUBLIC / "data/snapshots" / feed / "latest.json", body)

    snap("gistemp", "snapshot", "2025-01-01T00:00:00Z", "NASA GISTEMP v4", "NASA; credit GISTEMP Team", "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv", "J-D annual mean for 2025. 2026 is incomplete and is not filled.", [{"year": 2025, "value": 1.19}])
    snap("noaa-gml", "snapshot", "2026-09-01T00:00:00Z", "NOAA GML Mauna Loa CO2", "NOAA GML (Lan, Tans, Thoning)", "https://gml.noaa.gov/aftp/products/trends/co2/co2_mm_mlo.csv", "Monthly mean, September 2026.", [{"year": 2026, "month": 9, "ppm": 426.07}])
    snap("nsidc", "snapshot", "2026-09-15T00:00:00Z", "NSIDC Sea Ice Index v4", "Fetterer et al., NSIDC", "https://noaadata.apps.nsidc.org/NOAA/G02135/north/monthly/data/N_09_extent_v4.0.csv", "September 2026 Arctic extent.", [{"year": 2026, "extent": 4.81}])
    snap("open-meteo", "snapshot", "2026-11-13T11:00:00Z", "Open-Meteo", "CC BY 4.0", "https://api.open-meteo.com/v1/forecast", "Weather data by Open-Meteo.com. Cairo, retrieved 2026-11-13.", [{"time": "2026-11-13T11:00", "temperatureC": 26.8, "windKmh": 12.2, "precipitationMm": 0}])
    snap("open-meteo-aq", "snapshot", "2026-11-13T11:00:00Z", "Open-Meteo Air Quality", "CC BY 4.0; modified Copernicus Atmosphere Monitoring Service information", "https://air-quality-api.open-meteo.com/v1/air-quality", "CAMS model for Cairo, not a station. Retrieved 2026-11-13.", [{"time": "2026-11-13T11:00", "pm25": 11.5, "pm10": 16.3, "no2": 8.9, "o3": 95, "co": 167, "usAqi": 56}])
    snap("gibs-grid", "snapshot", "2024-08-15T00:00:00Z", "GHRSST MUR SST via NASA GIBS", "JPL MUR / PO.DAAC; NASA GIBS", "https://gibs.earthdata.nasa.gov/", "Area-weighted mean of opaque pixels in the 512×256 GIBS PNG. Colormap hit rate 1.0. Not a filled climatology.", [{"date": "2024-08-15", "meanC": 20.27085705774111, "n": 76301}])
    snap("eonet", "snapshot", "2026-11-12T00:22:00Z", "NASA EONET v3", "NASA; credit EONET", "https://eonet.gsfc.nasa.gov/api/v3/events", "Open events retrieved 2026-11-13. The bundled copy is a frozen subset.", [{"id": "EONET_26331", "title": "Wildfire Red Hill, Perry, Mississippi", "lat": 31.130069, "lon": -89.063853}])
    snap("firms-24h", "snapshot", "2026-11-12T00:00:00Z", "NASA FIRMS VIIRS NOAA-20", "LANCE FIRMS / ESDIS", "https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_24h.csv", "Partial excerpt from the start of the 24 h CSV (97 complete rows), not the full day.", [{"lat": -18.85008, "lon": -159.79056, "frp": 3.15, "date": "2026-11-12"}])

    assets = []
    files = [
        ("earth-day.webp", "/textures/earth-day.webp", "2k", "earth-day"),
        ("earth-day.jpg", "/textures/earth-day.jpg", "2k", "earth-day"),
        ("earth-relief.webp", "/textures/earth-relief.webp", "2k", "earth-relief-bathy"),
        ("earth-night.webp", "/textures/earth-night.webp", "2k", "earth-night"),
        ("earth-night-2012.webp", "/textures/earth-night-2012.webp", "2k", "earth-night-2012"),
        ("earth-height.png", "/textures/earth-height.png", "2k", "earth-height"),
        ("earth-water-mask.png", "/textures/earth-water-mask.png", "2k", "earth-water-mask"),
        ("earth-normal.webp", "/textures/earth-normal.webp", "2k", "earth-normal"),
        ("sst-ramp.png", "/ramps/sst.png", "ramp", "ramp-sst"),
        ("sst-2024-08-15.value.png", "/frames/ocean_sst/2024-08-15.value.png", "frame", "ocean-sst-value"),
        ("sst-2024-08-15.png", "/frames/ocean_sst/2024-08-15.png", "frame", "ocean-sst-color"),
    ]
    for name, rel, tier, role in files:
        data = (PUBLIC / rel.lstrip("/")).read_bytes()
        assets.append({
            "name": name,
            "path": rel,
            "url": rel,
            "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest(),
            "tier": tier,
            "role": role,
        })
    write(PUBLIC / "data/assets.manifest.json", {"version": 1, "generated": RETRIEVED, "assets": assets})
    (PUBLIC / "textures/SOURCE.txt").write_text(
        "\n".join(
            [
                "Retrieved 2026-11-13 from NASA GIBS WMS (EPSG:4326) and NOAA ETOPO 2022.",
                "earth-day: BlueMarble_NextGeneration, 2048x1024 JPEG and WebP. SHA-256 JPEG 7f1b66f435c3a21a3dce6a537818997a28c5a820dd218c45308054daf2eddabd.",
                "earth-relief: BlueMarble_ShadedRelief_Bathymetry, 2048x1024 WebP.",
                "earth-night: VIIRS_Black_Marble TIME=2016-01-01. earth-night-2012: TIME=2012-01-01.",
                "Night brightness index (image-derived, not calibrated radiance) is cosine-weighted luma of the 1024x512 PNGs.",
                "earth-height / water mask / normal: ETOPO 2022 v1 60 arc-second surface grid, area-averaged with GDAL to 2048x1024.",
                "Offset -10900 m, scale 19700 m. Himalaya sample about 6218 m, Mariana sample about -9433 m after averaging.",
                "SHA-256 of the source grid 9d27d4b8ea8e76977e2988bca667d7c8fa68b927355feffcddd6b4875a7fd08e.",
                "Credit NOAA NCEI 2022 ETOPO and NASA GIBS. Not endorsed by NASA or NOAA.",
                "4K and 8K files are not in the repo. They belong in the data-v1 release and the R2 bucket.",
                "",
            ]
        ),
        encoding="utf-8",
        newline="\n",
    )
    sources = []

    def add(group, sid, name, url, license_name, used, key, check):
        sources.append(
            {
                "id": sid,
                "name": name,
                "url": url,
                "license": license_name,
                "usedFor": used,
                "key": key,
                "group": group,
                "check": check,
            }
        )

    nasa = "NASA media guidelines; credit required; no implied endorsement"
    add("nasa", "spaceapps", "Space Apps challenge", "https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/", "Space Apps terms", "Challenge brief", "none", "TLS incomplete from the build box")
    add("nasa", "svs-eic", "SVS Earth Information Center gallery", "https://svs.gsfc.nasa.gov/gallery/earth-information-center/", nasa, "Index and links", "none", "WebFetch 2026-11-13")
    add("nasa", "svs-13786", "SVS 13786 Caldwell 73", "https://svs.gsfc.nasa.gov/13786/", "SYSTEM Sounds; NASA/ESA", "Sonification reference", "none", "API 2026-11-13")
    add("nasa", "svs-5313", "SVS 5313 night lights", "https://svs.gsfc.nasa.gov/5313/", nasa, "Night lights change", "none", "API 2026-11-13")
    add("nasa", "svs-5475", "SVS 5475 night lights", "https://svs.gsfc.nasa.gov/5475/", nasa, "Equirect night lights", "none", "API 2026-11-13")
    add("nasa", "svs-3912", "SVS 3912 ECCO2", "https://svs.gsfc.nasa.gov/3912/", nasa, "Ocean currents and SST frames", "none", "API 2026-11-13")
    add("nasa", "svs-5425", "SVS 5425 Perpetual Ocean 2", "https://svs.gsfc.nasa.gov/5425/", nasa, "Ocean visuals", "none", "API 2026-11-13")
    add("nasa", "svs-5669", "SVS 5669 aerosols", "https://svs.gsfc.nasa.gov/5669/", nasa, "Aerosol species", "none", "API 2026-11-13")
    add("nasa", "svs-5533", "SVS 5533 air quality", "https://svs.gsfc.nasa.gov/5533/", nasa, "Air quality frames", "none", "API 2026-11-13")
    add("nasa", "svs-5196", "SVS 5196 DYAMOND", "https://svs.gsfc.nasa.gov/5196/", nasa, "Optional CO2 visual", "none", "API 2026-11-13")
    add("nasa", "svs-5011", "SVS 5011 ISS LIS", "https://svs.gsfc.nasa.gov/5011/", nasa, "Lightning", "none", "API 2026-11-13")
    add("nasa", "svs-4960", "SVS 4960 atmospheric river", "https://svs.gsfc.nasa.gov/4960/", nasa, "Optional intro", "none", "API 2026-11-13")
    add("nasa", "svs-4950", "SVS 4950 GEDI", "https://svs.gsfc.nasa.gov/4950/", nasa, "Forest height, past the cut line", "none", "API 2026-11-13")
    add("nasa", "gibs", "NASA GIBS", "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/1.0.0/WMTSCapabilities.xml", "GIBS acknowledgement", "Textures, colormaps, daily layers", "none", "Fetched 2026-11-13")
    add("nasa", "gibs-docs", "GIBS API docs", "https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api", nasa, "Reference", "none", "2026-11-13")
    add("nasa", "firms", "NASA FIRMS", "https://firms.modaps.eosdis.nasa.gov/", "LANCE FIRMS / ESDIS acknowledgement", "Wildfire points", "FIRMS_MAP_KEY for the area API; none for the 24 h CSV", "24 h CSV header fetched 2026-11-13")
    add("nasa", "gistemp", "NASA GISS GISTEMP v4", "https://data.giss.nasa.gov/gistemp/", "Credit the GISTEMP Team", "Temperature", "none", "CSV fetched 2026-11-13")
    add("nasa", "eonet", "NASA EONET v3", "https://eonet.gsfc.nasa.gov/api/v3/events", "Credit NASA EONET", "Live events", "none", "Fetched 2026-11-13")
    add("nasa", "power", "NASA POWER", "https://power.larc.nasa.gov/", "Credit NASA LaRC POWER", "Optional Cairo history", "none", "Page checked 2026-11-13")
    add("nasa", "epic", "NASA EPIC", "https://epic.gsfc.nasa.gov/api/natural", "Credit the NASA EPIC team", "Optional Earth today", "none", "Page checked 2026-11-13")
    add("nasa", "cmr", "NASA CMR", "https://cmr.earthdata.nasa.gov/search/", nasa, "Pipeline discovery", "none", "2026-11-13")
    add("nasa", "worldview", "NASA Worldview", "https://worldview.earthdata.nasa.gov/", nasa, "Layer browsing reference", "none", "2026-11-13")
    add("nasa", "earth-gov", "Earth.gov", "https://earth.gov/", nasa, "Vital-sign links", "none", "2026-11-13")
    add("nasa", "media", "NASA media guidelines", "https://www.nasa.gov/nasa-brand-center/images-and-media/", nasa, "Usage rules", "none", "2026-11-13")
    add("other", "etopo", "NOAA ETOPO 2022", "https://www.ncei.noaa.gov/products/etopo-global-relief-model", "US government public domain; cite NOAA NCEI 2022", "Height, bathymetry, water mask, normals", "none", "Grid fetched and averaged 2026-11-13")
    add("other", "gml", "NOAA GML Mauna Loa CO2", "https://gml.noaa.gov/aftp/products/trends/co2/co2_mm_mlo.csv", "NOAA GML (Lan, Tans, Thoning)", "CO2", "none", "CSV fetched 2026-11-13")
    add("other", "gml-daily", "NOAA GML daily CO2", "https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_daily_mlo.csv", "NOAA GML", "CO2 daily", "none", "CSV fetched 2026-11-13")
    add("other", "nsidc", "NSIDC Sea Ice Index v4", "https://nsidc.org/data/g02135/versions/4", "Cite Fetterer et al., NSIDC", "Sea ice", "none", "September CSV fetched 2026-11-13")
    add("other", "open-meteo", "Open-Meteo forecast", "https://api.open-meteo.com/v1/forecast", "CC BY 4.0; Weather data by Open-Meteo.com", "Cairo weather", "none", "Fetched 2026-11-13")
    add("other", "open-meteo-aq", "Open-Meteo air quality", "https://air-quality-api.open-meteo.com/v1/air-quality", "CC BY 4.0; modified Copernicus Atmosphere Monitoring Service information", "Cairo model air quality", "none", "Fetched 2026-11-13")
    add("other", "open-meteo-terms", "Open-Meteo terms", "https://open-meteo.com/en/terms", "Open-Meteo terms", "Rate limits", "none", "2026-11-13")
    add("other", "openaq", "OpenAQ v3", "https://api.openaq.org/v3/", "OpenAQ terms; cite each provider", "Optional measured air quality", "OPENAQ_API_KEY", "401 without a key, 2026-11-13")
    add("other", "natural-earth", "Natural Earth", "https://www.naturalearthdata.com/", "Public domain; Made with Natural Earth", "Region outlines", "none", "CDN checked 2026-11-13")
    add("other", "gebco", "GEBCO", "https://www.gebco.net/data-products/gridded-bathymetry-data", "GEBCO terms", "Optional bathymetry", "none", "Not used; ETOPO is the height source")
    add("other", "r2", "Cloudflare R2", "https://developers.cloudflare.com/r2/", "Cloudflare terms", "Asset host", "R2 credentials", "Bucket earth-listens-assets")
    add("other", "github-releases", "GitHub Releases", "https://docs.github.com/en/repositories/releasing-projects-on-github", "GitHub terms", "Archive of record for 4K and 8K", "GITHUB_TOKEN", "Release data-v1 is created by Hassan")
    write(
        PUBLIC / "data/sources.json",
        {
            "retrieved": "2026-11-13",
            "note": "Uses NASA data and visualizations; not endorsed by NASA.",
            "sources": sources,
        },
    )
    print("wrote data files", len(sources))


if __name__ == "__main__":
    main()
