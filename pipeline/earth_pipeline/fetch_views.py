# ruff: noqa: E501
"""Download confirmed GIBS layers and write decoded frames.

Run from the repo root:

    python -m earth_pipeline.fetch_views

Missing dates are skipped. Nothing is interpolated. A frame with a colormap
hit rate under 0.99 is kept as an image only and does not enter a series.
"""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import numpy as np
from PIL import Image

from .derive import block_nanmean, grid_document
from .gibs import decode_image, lightning_seasons, parse_colormap, region_mean, wms_url
from .gibs_catalog import CONFIRMED, CONFIRMED_ON

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public"
RAW = Path("/tmp/gibs/raw")
WIDTH = 512
HEIGHT = 256
RETRIEVED = CONFIRMED_ON
GIBS_CREDIT = (
    "We acknowledge the use of imagery provided by services from NASA's Global Imagery "
    "Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS)."
)


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _get(url: str, dest: Path, timeout: int = 60) -> bytes:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return dest.read_bytes()
    request = urllib.request.Request(url, headers={"User-Agent": "earth-listens-pipeline"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        body = response.read()
    dest.write_bytes(body)
    return body


def _colormap(key: str) -> tuple[list, str]:
    spec = CONFIRMED[key]
    name = spec["colormap"].rsplit("/", 1)[-1]
    xml = _get(spec["colormap"], RAW / "colormaps" / name).decode("utf-8")
    return parse_colormap(xml)


def _dates_temperature() -> list[str]:
    # July exists across 1980–2023 and again from 2024-06. December 2023, January 2024
    # and May 2024 are absent from the capabilities time extent, so they are not requested.
    return [f"{year}-07-01" for year in range(1980, 2026)]


def _dates_ice() -> list[str]:
    dates = ["2012-09-15"]
    for year in range(2013, 2025):
        dates.append(f"{year}-03-15")
        dates.append(f"{year}-09-15")
    dates.append("2025-03-15")
    dates.append("2025-09-01")
    return dates


def _dates_co2() -> list[str]:
    return [f"{year}-07-01" for year in range(2003, 2012)]


def _dates_aerosols() -> list[str]:
    august = [f"{year}-08-01" for year in range(1980, 2026)]
    months = [f"2025-{month:02d}-01" for month in range(1, 13) if month != 8]
    return august + months


def _dates_precip() -> list[str]:
    monthly = [f"2024-{month:02d}-15" for month in range(1, 13)]
    end = dt.date(2026, 11, 12)
    daily = [(end - dt.timedelta(days=offset)).isoformat() for offset in range(29, -1, -1)]
    return monthly + daily


def _dates_ocean() -> list[str]:
    august = [f"{year}-08-15" for year in range(2003, 2026)]
    months = [f"2024-{month:02d}-15" for month in range(1, 13) if month != 8]
    return august + months


def _dates_lightning() -> list[dict[str, object]]:
    seasons = lightning_seasons()
    out = []
    for season in seasons:
        days = season["days"]
        if not isinstance(days, list) or not days:
            continue
        out.append({"id": season["id"], "day": days[0], "n_days": 1, "window": len(days)})
    return out


def _load_regions() -> list[dict[str, object]]:
    document = json.loads((PUBLIC / "data/regions.json").read_text(encoding="utf-8"))
    return list(document["regions"])


def _webp(png: Path, dest: Path) -> int:
    dest.parent.mkdir(parents=True, exist_ok=True)
    image = Image.open(png).convert("RGB")
    for quality in (72, 50, 30):
        image.save(dest, "WEBP", quality=quality, method=4)
        if dest.stat().st_size <= 100_000:
            break
    return dest.stat().st_size


def _numeric_t(when: str) -> float:
    year = int(when[0:4])
    month = int(when[5:7])
    day = int(when[8:10])
    return round(year + (month - 1) / 12 + (day - 1) / 366, 4)


def _point(when: str, value: float | None, *, yearly: bool) -> dict[str, object]:
    year = int(when[0:4])
    return {
        "t": year if yearly else _numeric_t(when),
        "v": None if value is None else round(value, 6),
        "q": "missing" if value is None else "ok",
    }


def _fetch_one(layer_key: str, when: str) -> dict[str, object]:
    spec = CONFIRMED[layer_key]
    layer_id = spec["id"]
    url = wms_url(layer_id, WIDTH, HEIGHT, "png", when)
    dest = RAW / layer_key / f"{when}.png"
    try:
        body = _get(url, dest)
    except Exception as error:  # noqa: BLE001 — one failed date must not invent a fill
        return {"when": when, "ok": False, "error": type(error).__name__}
    entries, units = _colormap(layer_key)
    values, rate, _opaque = decode_image(str(dest), entries)
    decoded = rate >= 0.99
    regions: dict[str, float | None] = {}
    if decoded:
        for region in _load_regions():
            bbox = region["bbox"]
            assert isinstance(bbox, list)
            regions[str(region["id"])] = region_mean(values, (bbox[0], bbox[1], bbox[2], bbox[3]))
    return {
        "when": when,
        "ok": True,
        "decoded": decoded,
        "hitRate": round(rate, 6),
        "units": units,
        "sha256": _sha256(body),
        "url": url,
        "bytes": len(body),
        "regions": regions,
        "values": values if decoded else None,
    }


def _write_products(raw_key: str, out_name: str, when: str, item: dict[str, object]) -> dict[str, object]:
    png = RAW / raw_key / f"{when}.png"
    webp = PUBLIC / "frames" / out_name / f"{when}.webp"
    _webp(png, webp)
    frame: dict[str, object] = {
        "t": when,
        "src": f"/frames/{out_name}/{when}.webp",
        "q": "ok" if item["decoded"] else "estimated",
    }
    values = item.get("values")
    if isinstance(values, np.ndarray):
        small = block_nanmean(values, 90, 180)
        grid_path = PUBLIC / "data" / "grids" / out_name / f"{when}.json"
        grid_path.parent.mkdir(parents=True, exist_ok=True)
        document = grid_document(
            small,
            layer=out_name,
            when=when,
            units=str(item.get("units") or ""),
            sha256=str(item["sha256"]),
            source_url=str(item["url"]),
        )
        grid_path.write_text(json.dumps(document, separators=(",", ":")), encoding="utf-8")
        frame["grid"] = f"/data/grids/{out_name}/{when}.json"
        if out_name == "forest":
            from .derive import quantize

            coded, _scale, _offset = quantize(values)
            raw_path = PUBLIC / "frames" / "forest" / f"{when}.value.png"
            Image.fromarray(coded, mode="L").save(raw_path)
            frame["value"] = f"/frames/forest/{when}.value.png"
    public = {key: value for key, value in item.items() if key != "values"}
    public["frame"] = frame
    return public


def _series_from(items: list[dict[str, object]], *, yearly: bool) -> dict[str, list[dict[str, object]]]:
    series: dict[str, list[dict[str, object]]] = {}
    for item in items:
        if not item.get("decoded"):
            continue
        regions = item.get("regions")
        if not isinstance(regions, dict):
            continue
        for region, value in regions.items():
            if value is None:
                continue
            series.setdefault(str(region), []).append(_point(str(item["when"]), float(value), yearly=yearly))
    for points in series.values():
        points.sort(key=lambda point: float(point["t"]))
        deduped: list[dict[str, object]] = []
        seen: set[float] = set()
        for point in points:
            stamp = float(point["t"])
            if stamp in seen:
                continue
            seen.add(stamp)
            deduped.append(point)
        points[:] = deduped
    return series


def _source(name: str, dataset_url: str, page: str, citation: str, sha: str, gibs_layer: str) -> dict[str, object]:
    return {
        "name": name,
        "dataset_url": dataset_url,
        "eic_page": page,
        "retrieved": RETRIEVED,
        "sha256": sha,
        "citation": citation,
        "ack": GIBS_CREDIT,
        "gibs_layer": gibs_layer,
        "license": "NASA media guidelines; credit required; no implied endorsement",
    }


def _hash_join(items: list[dict[str, object]]) -> str:
    lines = [str(item["sha256"]) for item in items if item.get("sha256")]
    return hashlib.sha256("\n".join(lines).encode("utf-8")).hexdigest()


def _read(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def _write(path: Path, document: dict[str, object]) -> None:
    path.write_text(json.dumps(document, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _run_layer(key: str, dates: list[str], workers: int = 6) -> list[dict[str, object]]:
    print(f"fetch {key} ({len(dates)} dates)", flush=True)
    found: list[dict[str, object]] = []
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(_fetch_one, key, when): when for when in dates}
        for future in as_completed(futures):
            item = future.result()
            if item.get("ok"):
                found.append(item)
            else:
                print(f"  skip {item.get('when')} {item.get('error')}", flush=True)
    found.sort(key=lambda item: str(item["when"]))
    out_name = "forest" if key == "forest_height" else key
    written = [_write_products(key, out_name, str(item["when"]), item) for item in found]
    # forest products were written under frames/forest but the raw key is forest_height.
    if key == "forest_height":
        for item, public in zip(found, written, strict=True):
            public["regions"] = item.get("regions")
    print(f"  kept {len(written)} / {len(dates)}", flush=True)
    return written


def _patch_history(layer: str, frames: list[dict[str, object]], extra_source: dict[str, object], note_en: str, note_ar: str) -> None:
    path = PUBLIC / "data" / "layers" / f"{layer}.json"
    document = _read(path)
    document["frames"] = frames
    source = document["source"]
    sources = source if isinstance(source, list) else [source]
    sources = [item for item in sources if item.get("gibs_layer") != extra_source["gibs_layer"]]
    sources.append(extra_source)
    document["source"] = sources
    description = document.get("description")
    if isinstance(description, dict):
        description["en"] = note_en
        description["ar"] = note_ar
    _write(path, document)


def _new_layer(
    layer: str,
    *,
    title: dict[str, str],
    unit: dict[str, str],
    source: dict[str, object],
    series: dict[str, list[dict[str, object]]],
    frames: list[dict[str, object]],
    description: dict[str, str],
    variables: dict[str, list[dict[str, object]]] | None = None,
    markers: list[dict[str, object]] | None = None,
    time_range: tuple[float, float] | None = None,
) -> None:
    stamps: list[float] = []
    for points in series.values():
        for point in points:
            if isinstance(point["t"], (int, float)):
                stamps.append(float(point["t"]))
    if time_range:
        lo, hi = time_range
    elif stamps:
        lo, hi = min(stamps), max(stamps)
    else:
        lo, hi = 0, 0
    document: dict[str, object] = {
        "id": layer,
        "sample": False,
        "title": title,
        "unit": unit,
        "source": source,
        "range": {"min": lo, "max": hi},
        "series": series,
        "annual": None,
        "cells": None,
        "seasonalAmplitude": None,
        "frames": frames,
        "events": [],
        "description": description,
    }
    if variables:
        document["variables"] = variables
    if markers is not None:
        document["markers"] = markers
    _write(PUBLIC / "data" / "layers" / f"{layer}.json", document)


def _frames_of(items: list[dict[str, object]]) -> list[dict[str, object]]:
    frames = []
    for item in items:
        frame = item.get("frame")
        if isinstance(frame, dict):
            frames.append(frame)
    frames.sort(key=lambda frame: str(frame["t"]))
    return frames


def _view(layer: str, credit: list[str], note: str, ramp_id: str, domain: tuple[float, float], unit: str, colormap: str) -> None:
    document = {
        "id": layer,
        "base": "earth-day",
        "baseDim": 0,
        "night": True,
        "height": {
            "src": "/textures/earth-height.png",
            "offset": -10900,
            "scale": 19700,
            "exaggeration": 0.02 if layer == "forest" else 0.012,
            **(
                {"canopy": {"src": "/frames/forest/2019-04-18.value.png", "exaggeration": 0.04}}
                if layer == "forest"
                else {}
            ),
        },
        "overlay": {
            "kind": "value",
            "mask": "water" if layer == "ocean_sst" else "none",
            "ramp": {
                "id": ramp_id,
                "src": "/ramps/sst.png" if layer == "ocean_sst" else "/ramps/sequential.png",
                "domain": list(domain),
                "unit": {"en": unit, "ar": unit},
                "kind": "diverging" if layer in {"temperature", "co2"} else "sequential",
                "source": colormap,
            },
            "opacity": 0.85,
        },
        "cameras": [
            {
                "id": "default",
                "label": {"en": "Overview", "ar": "نظرة عامة"},
                "lat": 20 if layer != "sea_ice" else 78,
                "lon": 10 if layer != "sea_ice" else 0,
                "alt": 2.2,
            }
        ],
        "beforeAfter": None,
        "transitionMs": 900,
        "credit": credit,
        "note": note,
    }
    _write(PUBLIC / "data" / "views" / f"{layer}.view.json", document)


def _point_registry() -> None:
    path = PUBLIC / "data" / "registry.json"
    document = _read(path)
    layers = document["layers"]
    assert isinstance(layers, list)
    for entry in layers:
        if not isinstance(entry, dict):
            continue
        layer_id = str(entry["id"])
        view = PUBLIC / "data" / "views" / f"{layer_id}.view.json"
        if view.exists():
            entry["view"] = f"/data/views/{layer_id}.view.json"
        real = PUBLIC / "data" / "layers" / f"{layer_id}.json"
        if real.exists() and entry.get("data", "").endswith(".sample.json"):
            # Only switch a registry pointer when this run wrote a real file.
            if layer_id in {"aerosols", "lightning", "forest", "precipitation", "events", "ocean_sst", "air_quality"}:
                entry["data"] = f"/data/layers/{layer_id}.json"
    _write(path, document)


def _sequential_ramp() -> None:
    """A small blue-to-amber legend used by layers that do not have their own ramp PNG yet."""
    dest = PUBLIC / "ramps" / "sequential.png"
    if dest.exists():
        return
    width = 256
    image = np.zeros((8, width, 3), dtype=np.uint8)
    for x in range(width):
        t = x / (width - 1)
        image[:, x, 0] = int(40 + 200 * t)
        image[:, x, 1] = int(90 + 80 * (1 - abs(t - 0.5) * 2))
        image[:, x, 2] = int(220 * (1 - t))
    dest.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(image, mode="RGB").save(dest)


def build() -> None:
    _sequential_ramp()
    for key in (
        "temperature",
        "sea_ice",
        "forest_height",
        "forest_stddev",
        "forest_biomass",
        "precipitation",
        "co2",
        "aerosols",
        "lightning",
        "ocean_sst",
    ):
        _colormap(key)
    regions_note = "Regional values are cosine-latitude means of the decoded 512×256 GIBS PNG. Missing dates are omitted."

    temperature = _run_layer("temperature", _dates_temperature())
    temp_frames = _frames_of(temperature)
    temp_source = _source(
        "NASA GMAO MERRA-2 2 m air temperature, monthly, via GIBS",
        "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi",
        "https://nasa-gibs.github.io/gibs-api-docs/available-visualizations/",
        f"July field each year 1980–2025, layer MERRA2_2m_Air_Temperature_Monthly. {regions_note} Not the GISTEMP annual mean. Confirmed in WMTS capabilities on {RETRIEVED}.",
        _hash_join(temperature),
        CONFIRMED["temperature"]["id"],
    )
    if not temp_frames:
        raise SystemExit("temperature fetch produced no frames; leaving the recorded history untouched")
    _patch_history(
        "temperature",
        temp_frames,
        temp_source,
        "GISTEMP v4 annual global mean anomaly versus 1951–1980. No regional series. Globe maps are MERRA-2 July 2 m air temperature, 1980–2025, decoded from GIBS. There is no map before 1980. A July field is not the annual mean.",
        "شذوذ GISTEMP v4 السنوي مقارنة بـ 1951–1980. لا توجد سلسلة إقليمية. خرائط الكرة هي حرارة الهواء على مترين من MERRA-2 لشهر يوليو 1980–2025 من GIBS. لا توجد خريطة قبل 1980. حقل يوليو ليس المتوسط السنوي.",
    )

    ice = _run_layer("sea_ice", _dates_ice())
    if not ice:
        raise SystemExit("sea ice fetch produced no frames")
    ice_source = _source(
        "NASA/JAXA AMSR2 sea-ice concentration 12 km, via GIBS",
        "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi",
        "https://nsidc.org/data/g02135",
        f"AMSRU2_Sea_Ice_Concentration_12km on 15 March and 15 September (1 September 2025, because the layer ends that day). Numbers in the series stay the NSIDC September extent. {regions_note}",
        _hash_join(ice),
        CONFIRMED["sea_ice"]["id"],
    )
    _patch_history(
        "sea_ice",
        _frames_of(ice),
        ice_source,
        "NSIDC Sea Ice Index September extent, Arctic only. Concentration maps are AMSR2 via GIBS for March and September, 2012–2025. There is no concentration map before July 2012.",
        "امتداد جليد سبتمبر من NSIDC للقطب فقط. خرائط التركيز من AMSR2 عبر GIBS لشهري مارس وسبتمبر 2012–2025. لا توجد خريطة تركيز قبل يوليو 2012.",
    )

    co2 = _run_layer("co2", _dates_co2())
    if not co2:
        raise SystemExit("CO2 fetch produced no frames")
    co2_source = _source(
        "NASA AIRS/AMSU mid-tropospheric CO₂, monthly, via GIBS",
        "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi",
        "https://gml.noaa.gov/ccgg/trends/",
        f"AIRS_L3_Carbon_Dioxide_AIRS_AMSU_Monthly, July 2003–2011. The layer ends February 2012. The sounded numbers stay Mauna Loa. {regions_note}",
        _hash_join(co2),
        CONFIRMED["co2"]["id"],
    )
    _patch_history(
        "co2",
        _frames_of(co2),
        co2_source,
        "NOAA GML Mauna Loa monthly CO₂. Maps are AIRS mid-troposphere July fields, 2003–2011. Outside 2002–2012 there is no AIRS map. The map is not the Mauna Loa number.",
        "ثاني أكسيد الكربون الشهري من ماونا لوا. الخرائط حقول يوليو من AIRS لمنتصف التروبوسفير 2003–2011. خارج 2002–2012 لا توجد خريطة AIRS. الخريطة ليست رقم ماونا لوا.",
    )

    aerosols = _run_layer("aerosols", _dates_aerosols())
    aerosol_series = _series_from(
        [item for item in aerosols if str(item["when"]).endswith("-08-01")],
        yearly=True,
    )
    _new_layer(
        "aerosols",
        title={"en": "Aerosols", "ar": "الهباء الجوي"},
        unit={"en": "AOD at 550 nm", "ar": "AOD عند 550 نانومتر"},
        source=_source(
            "NASA GMAO MERRA-2 aerosol optical depth, monthly, via GIBS",
            "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi",
            "https://svs.gsfc.nasa.gov/5669/",
            f"MERRA2_Aerosol_Optical_Depth_Analysis_Monthly. Series values are the August field, 1980–2025, not an annual mean. Extra frames are the months of 2025. {regions_note}",
            _hash_join(aerosols),
            CONFIRMED["aerosols"]["id"],
        ),
        series=aerosol_series,
        frames=_frames_of(aerosols),
        description={
            "en": "MERRA-2 monthly AOD at 550 nm, decoded from GIBS. The sounded series is each August. 2025 also has a frame per month. This is a model analysis, not a station measurement.",
            "ar": "العمق البصري للأهباء من MERRA-2 عبر GIBS. السلسلة المسموعة هي شهر أغسطس من كل سنة. 2025 فيها إطار لكل شهر. هذا تحليل نموذج وليس قياس محطة.",
        },
    )

    lightning_plan = _dates_lightning()
    lightning_items = []
    for season in lightning_plan:
        item = _fetch_one("lightning", str(season["day"]))
        if not item.get("ok"):
            print(f"  skip lightning {season['id']} {item.get('error')}", flush=True)
            continue
        written = _write_products("lightning", "lightning", str(season["day"]), item)
        frame = written["frame"]
        assert isinstance(frame, dict)
        frame["t"] = str(season["id"])
        # ISO sort of season ids is not chronological (2020-DJF vs 2020-JJA is fine;
        # DJF < JJA < MAM < SON is NOT chronological). Use the day as t for ordering,
        # and keep the season id in the grid name already written.
        frame["t"] = str(season["day"])
        written["season"] = season["id"]
        written["n_days"] = 1
        lightning_items.append(written)
    lightning_items.sort(key=lambda item: str(item["when"]))
    offsets = {"DJF": 0.1, "MAM": 0.2, "JJA": 0.3, "SON": 0.4}
    lightning_series: dict[str, list[dict[str, object]]] = {}
    for item in lightning_items:
        if not item.get("decoded"):
            continue
        season_id = str(item.get("season") or "")
        year_text, _, code = season_id.partition("-")
        stamp = round(int(year_text) + offsets.get(code, 0.0), 1) if year_text.isdigit() else None
        regions = item.get("regions")
        if stamp is None or not isinstance(regions, dict):
            continue
        for region, value in regions.items():
            if value is None:
                continue
            lightning_series.setdefault(str(region), []).append(
                {"t": stamp, "v": round(float(value), 6), "q": "ok"}
            )
    for points in lightning_series.values():
        points.sort(key=lambda point: float(point["t"]))
    _new_layer(
        "lightning",
        title={"en": "Lightning", "ar": "البرق"},
        unit={"en": "ISS LIS flash count (image scale)", "ar": "عدد ومضات LIS (مقياس الصورة)"},
        source=_source(
            "ISS LIS flash count, via GIBS",
            "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi",
            "https://svs.gsfc.nasa.gov/5011/",
            "One day from each 10-day season window, MAM 2017 through JJA 2021 (18 seasons). n_days is 1. The other nine days are not filled. LIS_ISS_Flash_Count.",
            _hash_join(lightning_items),
            CONFIRMED["lightning"]["id"],
        ),
        series=lightning_series,
        frames=_frames_of(lightning_items),
        description={
            "en": "ISS LIS daily flash count, one day from each of 18 seasons (2017–2021). Missing days in the 10-day window are not filled. There is no live lightning feed.",
            "ar": "عدد ومضات LIS من المحطة الدولية، يوم واحد من كل موسم من 18 موسمًا (2017–2021). أيام النافذة الناقصة لا تُملأ. لا يوجد بث برق مباشر.",
        },
        time_range=(2017, 2021),
    )

    precip = _run_layer("precipitation", _dates_precip())
    _new_layer(
        "precipitation",
        title={"en": "Precipitation", "ar": "هطول الأمطار"},
        unit={"en": "precipitation rate, mm/day", "ar": "معدل الهطول، مم/يوم"},
        source=_source(
            "NASA GPM IMERG precipitation rate, daily, via GIBS",
            "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi",
            "https://svs.gsfc.nasa.gov/4960/",
            f"IMERG_Precipitation_Rate. Twelve mid-month days in 2024 (the 15th, not a monthly mean) and 30 daily fields ending 2026-11-12. {regions_note}",
            _hash_join(precip),
            CONFIRMED["precipitation"]["id"],
        ),
        series=_series_from(precip, yearly=False),
        frames=_frames_of(precip),
        description={
            "en": "IMERG daily precipitation rate from GIBS. 2024 contributes the 15th of each month, which is one day, not a monthly mean. A further 30 days end on 2026-11-12. Zero rain is silence.",
            "ar": "معدل الهطول اليومي من IMERG عبر GIBS. 2024 فيها يوم 15 من كل شهر، وهو يوم واحد وليس متوسط الشهر. ثم 30 يومًا تنتهي في 2026-11-12. المطر الصفري صمت.",
        },
    )

    forest_items = _run_layer("forest_height", ["2019-04-18"])
    std_items = _run_layer("forest_stddev", ["2019-04-18"])
    mass_items = _run_layer("forest_biomass", ["2019-04-18"])
    # Those two writes landed in frames/forest_stddev and frames/forest_biomass.
    # The height product is the forest layer. Stddev and biomass are variables.
    height_series = _series_from(forest_items, yearly=True)
    for points in height_series.values():
        for point in points:
            point["t"] = 2023
    variables: dict[str, list[dict[str, object]]] = {}
    if std_items and std_items[0].get("decoded"):
        regions = std_items[0].get("regions")
        if isinstance(regions, dict) and regions.get("global") is not None:
            variables["stddev"] = [{"t": 2023, "v": round(float(regions["global"]), 6), "q": "ok"}]
    if mass_items and mass_items[0].get("decoded"):
        regions = mass_items[0].get("regions")
        if isinstance(regions, dict) and regions.get("global") is not None:
            variables["biomass"] = [{"t": 2023, "v": round(float(regions["global"]), 6), "q": "ok"}]
    forest_source = _source(
        "GEDI L3 canopy height and L4B biomass, via GIBS",
        "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi",
        "https://svs.gsfc.nasa.gov/4950/",
        "Cumulative GEDI products for 2019-04-18 through 2023-03. One static field, not a yearly time series. Height, standard deviation, and aboveground biomass are separate layers.",
        _hash_join(forest_items + std_items + mass_items),
        CONFIRMED["forest_height"]["id"],
    )
    _new_layer(
        "forest",
        title={"en": "Forest height", "ar": "ارتفاع الغابات"},
        unit={"en": "canopy height, m", "ar": "ارتفاع الغطاء، م"},
        source=forest_source,
        series=height_series,
        frames=_frames_of(forest_items),
        description={
            "en": "GEDI L3 mean canopy height (RH100), cumulative April 2019–March 2023. One map, not a trend. Standard deviation and biomass are global means of the matching GIBS layers. Coverage grew over the mission; this file does not split that growth into years.",
            "ar": "متوسط ارتفاع الغطاء من GEDI L3، تراكمي من أبريل 2019 إلى مارس 2023. خريطة واحدة وليست اتجاهًا. الانحراف المعياري والكتلة الحيوية متوسطان عالميان من طبقتي GIBS المقابلتين.",
        },
        variables=variables or None,
        time_range=(2019, 2023),
    )

    ocean = _run_layer("ocean_sst", _dates_ocean())
    _new_layer(
        "ocean_sst",
        title={"en": "Sea surface temperature", "ar": "حرارة سطح البحر"},
        unit={"en": "°C", "ar": "°C"},
        source=_source(
            "GHRSST MUR L4 sea surface temperature, via GIBS",
            "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi",
            "https://podaac.jpl.nasa.gov/MEaSUREs-MUR",
            f"GHRSST_L4_MUR_Sea_Surface_Temperature. 15 August each year 2003–2025, plus the 15th of the other months in 2024. A single day is not a monthly or annual mean. {regions_note}",
            _hash_join(ocean),
            CONFIRMED["ocean_sst"]["id"],
        ),
        series=_series_from(ocean, yearly=False),
        frames=_frames_of(ocean),
        description={
            "en": "MUR sea-surface temperature decoded from GIBS. The series is the field mean of each downloaded day (15 August 2003–2025, and the other mid-month days of 2024). It is not an annual mean.",
            "ar": "حرارة سطح البحر من MUR عبر GIBS. السلسلة متوسط كل يوم محمّل (15 أغسطس 2003–2025، وأيام منتصف الشهور الأخرى في 2024). ليست متوسطًا سنويًا.",
        },
    )

    _fetch_events()
    _view(
        "temperature",
        [temp_source["citation"], GIBS_CREDIT, "GISTEMP Team, 2026: GISS Surface Temperature Analysis (GISTEMP), version 4."],
        "July MERRA-2 maps from 1980. GISTEMP is the number you hear. No map before 1980.",
        "temperature",
        (240, 310),
        "K",
        CONFIRMED["temperature"]["colormap"],
    )
    _view(
        "sea_ice",
        [ice_source["citation"], GIBS_CREDIT],
        "Concentration maps from 2012. The pitch is the NSIDC September extent.",
        "ice",
        (0, 100),
        "%",
        CONFIRMED["sea_ice"]["colormap"],
    )
    _view(
        "co2",
        [co2_source["citation"], GIBS_CREDIT],
        "AIRS July maps 2003–2011. The drone is Mauna Loa. No AIRS map outside 2002–2012.",
        "co2",
        (360, 400),
        "ppm",
        CONFIRMED["co2"]["colormap"],
    )
    _view(
        "aerosols",
        ["MERRA-2 AOD via GIBS.", GIBS_CREDIT, "SVS 5669 for the species still, when a card is shown."],
        "August AOD drives the tone. 2025 has a frame for each month.",
        "aod",
        (0, 1),
        "AOD",
        CONFIRMED["aerosols"]["colormap"],
    )
    _view(
        "lightning",
        ["ISS LIS flash count via GIBS.", GIBS_CREDIT],
        "One day from each of 18 seasons. Other days in the window are not filled.",
        "lis",
        (0, 1),
        "flashes",
        CONFIRMED["lightning"]["colormap"],
    )
    _view(
        "precipitation",
        ["GPM IMERG via GIBS.", GIBS_CREDIT],
        "Daily rate. The 2024 frames are the 15th, not monthly means. Zero rain is silence.",
        "rain",
        (0, 50),
        "mm/day",
        CONFIRMED["precipitation"]["colormap"],
    )
    _view(
        "forest",
        ["GEDI L3/L4B via GIBS.", GIBS_CREDIT, "NASA SVS 4950."],
        "One cumulative canopy map, 2019-04 to 2023-03. Not a yearly trend.",
        "canopy",
        (0, 40),
        "m",
        CONFIRMED["forest_height"]["colormap"],
    )
    _view(
        "ocean_sst",
        ["JPL MUR GHRSST L4 via GIBS.", GIBS_CREDIT],
        "Daily MUR fields. 15 August 2003–2025, plus other mid-month days in 2024.",
        "sst",
        (-2, 32),
        "°C",
        CONFIRMED["ocean_sst"]["colormap"],
    )
    _point_registry()
    print("done", flush=True)


def _fetch_events() -> None:
    url = "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30"
    try:
        body = _get(url, RAW / "eonet-open-30d.json", timeout=40)
    except Exception as error:  # noqa: BLE001
        print(f"eonet skipped {type(error).__name__}", flush=True)
        return
    payload = json.loads(body)
    events = payload.get("events") if isinstance(payload, dict) else None
    if not isinstance(events, list):
        print("eonet skipped: no events array", flush=True)
        return
    markers = []
    for event in events[:200]:
        if not isinstance(event, dict):
            continue
        geometry = event.get("geometry")
        if not isinstance(geometry, list) or not geometry:
            continue
        first = geometry[0]
        if not isinstance(first, dict):
            continue
        coords = first.get("coordinates")
        if not isinstance(coords, list) or len(coords) < 2:
            continue
        lon, lat = coords[0], coords[1]
        if not isinstance(lon, (int, float)) or not isinstance(lat, (int, float)):
            continue
        categories = event.get("categories")
        category = "event"
        if isinstance(categories, list) and categories and isinstance(categories[0], dict):
            category = str(categories[0].get("title") or "event")
        link = ""
        sources = event.get("sources")
        if isinstance(sources, list) and sources and isinstance(sources[0], dict):
            link = str(sources[0].get("url") or "")
        marker = {
            "id": str(event.get("id") or f"eonet-{len(markers)}"),
            "category": category,
            "lat": float(lat),
            "lon": float(lon),
            "t": str(first.get("date") or RETRIEVED),
            "title": str(event.get("title") or category),
        }
        if link.startswith("https://"):
            marker["link"] = link
        markers.append(marker)
    count = len(markers)
    _new_layer(
        "events",
        title={"en": "Natural events", "ar": "أحداث طبيعية"},
        unit={"en": "open events", "ar": "أحداث مفتوحة"},
        source={
            "name": "NASA EONET v3 open events",
            "dataset_url": url,
            "eic_page": "https://eonet.gsfc.nasa.gov/docs/v3",
            "retrieved": RETRIEVED,
            "sha256": _sha256(body),
            "citation": "NASA Earth Observatory Natural Event Tracker (EONET) API v3. Open events from the last 30 days. Not a historical census.",
            "ack": None,
            "license": "NASA; credit EONET",
        },
        series={"global": [{"t": 2026, "v": count, "q": "ok"}]} if count else {},
        frames=[],
        description={
            "en": f"NASA EONET open events for the 30 days before {RETRIEVED}: {count} events with coordinates. This is not a yearly history. Earcons fire as the playhead passes each longitude.",
            "ar": f"أحداث EONET المفتوحة خلال 30 يومًا قبل {RETRIEVED}: {count} حدثًا بإحداثيات. هذه ليست سلسلة سنوية. الإشارات تُسمع حين يمر المؤشر على خط طول الحدث.",
        },
        markers=markers,
        time_range=(2026, 2026),
    )
    snapshot = {
        "feed": "eonet",
        "status": "snapshot",
        "dataTime": RETRIEVED,
        "fetchedAt": f"{RETRIEVED}T00:00:00Z",
        "source": {
            "name": "NASA EONET v3",
            "url": "https://eonet.gsfc.nasa.gov/api/v3/events",
            "license": "NASA; credit EONET",
        },
        "latencyNote": f"Open events, status=open&days=30, retrieved {RETRIEVED}. {count} events with coordinates, capped at 200.",
        "snapshotId": _sha256(body)[:16],
        "items": [
            {"id": marker["id"], "title": marker["title"], "lat": marker["lat"], "lon": marker["lon"], "category": marker["category"]}
            for marker in markers
        ],
    }
    snap_path = PUBLIC / "data" / "snapshots" / "eonet" / "latest.json"
    _write(snap_path, snapshot)
    print(f"eonet {count} events", flush=True)


def main() -> None:
    build()


if __name__ == "__main__":
    main()
