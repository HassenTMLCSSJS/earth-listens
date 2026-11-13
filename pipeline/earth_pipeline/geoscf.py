"""GEOS-CF composition grid helpers. No network in unit tests."""

from __future__ import annotations

import math
from datetime import datetime, timezone

COLLECTION = "https://opendap.nccs.nasa.gov/dods/gmao/geos-cf/assim/aqc_tavg_1hr_g1440x721_v1"
BASE = datetime(2018, 1, 1, 0, 30, tzinfo=timezone.utc)
FILL = 1.0e15
# µg/m³ per ppbv at 25 °C and 1013.25 hPa: MW / 24.465
GAS_UG_PER_PPBV = {"co": 28 / 24.465, "no2": 46 / 24.465, "o3": 48 / 24.465, "so2": 64 / 24.465}


def index_for(lat: float, lon: float, when: datetime) -> tuple[int, int, int]:
    """Return (time, lat, lon) indexes on the 0.25° hourly grid."""
    if when.tzinfo is None:
        when = when.replace(tzinfo=timezone.utc)
    hours = (when - BASE).total_seconds() / 3600
    t_idx = int(round(hours))
    lat_idx = int(round((lat + 90) / 0.25))
    lon_idx = int(round((lon + 180) / 0.25))
    return t_idx, lat_idx, lon_idx


def ascii_url(variable: str, t_idx: int, lat_idx: int, lon_idx: int) -> str:
    return (
        f"{COLLECTION}.ascii?{variable}[{t_idx}:{t_idx}][0][{lat_idx}][{lon_idx}]"
    )


def parse_ascii(text: str) -> list[float | None]:
    """Pull the numeric payload. 1e15 is missing, never zero."""
    values: list[float | None] = []
    for line in text.splitlines():
        if not line.startswith("["):
            continue
        _head, _, tail = line.partition(",")
        if not tail.strip():
            continue
        for token in tail.split(","):
            token = token.strip()
            if not token:
                continue
            try:
                number = float(token)
            except ValueError:
                continue
            if not math.isfinite(number) or abs(number) >= FILL / 10:
                values.append(None)
            else:
                values.append(number)
    return values


def vmr_to_ugm3(vmr: float | None, gas: str) -> float | None:
    if vmr is None:
        return None
    factor = GAS_UG_PER_PPBV[gas]
    return vmr * 1e9 * factor
