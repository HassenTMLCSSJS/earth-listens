"""Area weights, 5° fire bins and robust percentiles. Identical to the TypeScript math."""

from __future__ import annotations

import math


def area_weighted_mean(lats: list[float], values: list[float | None]) -> float | None:
    num = 0.0
    den = 0.0
    for lat, value in zip(lats, values, strict=False):
        if value is None or not math.isfinite(value):
            continue
        weight = math.cos(math.radians(lat))
        num += weight * value
        den += weight
    if den == 0:
        return None
    return num / den


def fire_cell(lat: float, lon: float) -> tuple[float, float]:
    def axis(value: float, limit: float) -> float:
        edge = math.floor(value / 5) * 5 + 2.5
        return min(limit, max(-limit, edge))

    return axis(lat, 87.5), axis(lon, 177.5)


def bin_fires_5deg(rows: list[dict[str, float]]) -> list[dict[str, float]]:
    buckets: dict[tuple[float, float], list[dict[str, float]]] = {}
    for row in rows:
        cell = fire_cell(row["latitude"], row["longitude"])
        buckets.setdefault(cell, []).append(row)
    binned = []
    for (lat, lon), group in buckets.items():
        binned.append(
            {
                "lat": lat,
                "lon": lon,
                "count": float(len(group)),
                "frp_mean": sum(item["frp"] for item in group) / len(group),
            }
        )
    return binned


def top_cells(rows: list[dict[str, float]], n: int = 24) -> list[dict[str, float]]:
    return sorted(rows, key=lambda row: (-row["count"], -row["lat"], row["lon"]))[:n]


def percentile_linear(sorted_values: list[float], p: float) -> float:
    count = len(sorted_values)
    if count == 0:
        return math.nan
    if count == 1:
        return sorted_values[0]
    h = ((count - 1) * p) / 100
    lo = math.floor(h)
    hi = math.ceil(h)
    return sorted_values[lo] + (h - lo) * (sorted_values[hi] - sorted_values[lo])


def robust_range(values: list[float], p: tuple[float, float] = (5, 95)) -> tuple[float, float]:
    finite = sorted(value for value in values if math.isfinite(value))
    if len(finite) < 2:
        only = finite[0] if finite else 0.0
        return only, only
    return percentile_linear(finite, p[0]), percentile_linear(finite, p[1])
