# ruff: noqa: E501
"""Cairo GEOS-CF seasonal samples, 2018–2025. No invented fills."""

from __future__ import annotations

import hashlib
import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from .geoscf import ascii_url, index_for, parse_ascii, vmr_to_ugm3

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public"
RETRIEVED = "2026-11-13"
GASES = ("co", "no2", "o3")
MONTHS = (1, 4, 7, 10)


def _get(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "earth-listens-pipeline"})
    with urllib.request.urlopen(request, timeout=40) as response:
        return response.read().decode("utf-8")


def main() -> None:
    raw_parts: list[str] = []
    by_var: dict[str, list[tuple[int, float]]] = {name: [] for name in ("pm25", *GASES)}
    for year in range(2018, 2026):
        for month in MONTHS:
            when = datetime(year, month, 15, 12, 30, tzinfo=timezone.utc)
            t_idx, lat_idx, lon_idx = index_for(30.04, 31.24, when)
            for variable, key in (
                ("pm25_rh35_gcc", "pm25"),
                ("co", "co"),
                ("no2", "no2"),
                ("o3", "o3"),
            ):
                url = ascii_url(variable, t_idx, lat_idx, lon_idx)
                try:
                    text = _get(url)
                except Exception as error:  # noqa: BLE001
                    print(f"skip {variable} {when.date()} {type(error).__name__}", flush=True)
                    continue
                raw_parts.append(text)
                parsed = parse_ascii(text)
                if not parsed or parsed[0] is None:
                    continue
                value = parsed[0]
                if key != "pm25":
                    converted = vmr_to_ugm3(value, key)
                    if converted is None:
                        continue
                    value = converted
                by_var[key].append((year, value))
            print(f"cairo {year}-{month:02d}", flush=True)

    def annual(pairs: list[tuple[int, float]]) -> list[dict[str, object]]:
        grouped: dict[int, list[float]] = {}
        for year, value in pairs:
            grouped.setdefault(year, []).append(value)
        points = []
        for year in sorted(grouped):
            samples = grouped[year]
            points.append({"t": year, "v": round(sum(samples) / len(samples), 4), "q": "estimated"})
        return points

    digest = hashlib.sha256("".join(raw_parts).encode("utf-8")).hexdigest()
    pm = annual(by_var["pm25"])
    document = {
        "id": "air_quality",
        "sample": False,
        "title": {"en": "Air quality", "ar": "جودة الهواء"},
        "unit": {"en": "µg/m³", "ar": "µg/m³"},
        "source": {
            "name": "NASA GEOS-CF composition, Cairo grid cell",
            "dataset_url": "https://opendap.nccs.nasa.gov/dods/gmao/geos-cf/assim/aqc_tavg_1hr_g1440x721_v1",
            "eic_page": "https://gmao.gsfc.nasa.gov/gmao-products/geos-cf/",
            "retrieved": RETRIEVED,
            "sha256": digest,
            "citation": "GEOS-CF aqc_tavg_1hr_g1440x721_v1, surface model layer index 72 (not 72 hPa). Cairo cell lat 480, lon 845 (30.04°N, 31.24°E). Four hours each year: 12:30Z on 15 Jan, Apr, Jul and Oct, 2018–2025. The annual figure is the mean of those hours, q estimated, not a full-year mean and not a regional mean. PM2.5 is pm25_rh35_gcc in µg/m³. Gases are dry-air volume mixing ratio converted at 25 °C and 1013.25 hPa (µg/m³ = ppbv × MW / 24.465). Modeled, not a station measurement, not an AQI. 1e15 is missing and was dropped. Knowland et al., GMAO Office Note 17.",
            "ack": None,
            "license": "NASA; credit GMAO GEOS-CF",
        },
        "range": {"min": 2018, "max": 2025},
        "series": {"egypt": pm} if pm else {},
        "annual": None,
        "cells": None,
        "seasonalAmplitude": None,
        "frames": [],
        "events": [],
        "variables": {gas: annual(by_var[gas]) for gas in GASES if by_var[gas]},
        "description": {
            "en": "Modeled GEOS-CF air quality for the Cairo cell, not station measurements and not an AQI. PM2.5 is the sounded value. CO, NO₂ and O₃ are stored in variables as µg/m³ at 25 °C and 1013.25 hPa. Each year is four afternoons, not a complete mean. OpenAQ stations are separate and need a key.",
            "ar": "جودة هواء من نموذج GEOS-CF لخلية القاهرة، ليست قياس محطة وليست مؤشر جودة هواء. PM2.5 هي القيمة المسموعة. CO وNO₂ وO₃ مخزّنة بالميكروغرام لكل متر مكعب عند 25 °م و1013.25 هكتوباسكال. كل سنة أربعة أوقات بعد الظهر، وليست متوسطًا كاملًا. محطات OpenAQ منفصلة وتحتاج مفتاحًا.",
        },
    }
    path = PUBLIC / "data" / "layers" / "air_quality.json"
    path.write_text(json.dumps(document, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    registry_path = PUBLIC / "data" / "registry.json"
    registry = json.loads(registry_path.read_text(encoding="utf-8"))
    for layer in registry["layers"]:
        if layer["id"] == "air_quality" and pm:
            layer["data"] = "/data/layers/air_quality.json"
    registry_path.write_text(json.dumps(registry, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"air years {len(pm)} sha {digest[:12]}", flush=True)


if __name__ == "__main__":
    main()
