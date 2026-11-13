"""GIBS colormap decode and the lightning season calendar. No network in tests."""

from __future__ import annotations

import math
import re
from dataclasses import dataclass

import numpy as np
from PIL import Image


@dataclass(frozen=True)
class Entry:
    rgb: tuple[int, int, int]
    ref: int
    mid: float | None
    estimated: bool
    nodata: bool


def _edge(token: str) -> float | None:
    if "INF" in token:
        return None
    return float(token)


def parse_colormap(xml: str) -> tuple[list[Entry], str]:
    units = ""
    units_match = re.search(r'units="([^"]+)"', xml)
    if units_match:
        units = units_match.group(1)
    entries: list[Entry] = []
    for match in re.finditer(r"<ColorMapEntry\b([^>]*)/>", xml):
        tag = match.group(1)
        def attr(name: str, tag: str = tag) -> str | None:
            found = re.search(fr'{name}="([^"]*)"', tag)
            return found.group(1) if found else None

        rgb_text = attr("rgb")
        if not rgb_text:
            continue
        rgb = tuple(int(part) for part in rgb_text.split(","))
        source = attr("sourceValue")
        nodata = attr("nodata") == "true" or (attr("transparent") == "true" and not source)
        mid = None
        estimated = False
        if source:
            text = source.strip()
            if text[:1] in "[(" and text[-1:] in "])":
                text = text[1:-1]
            if "," in text:
                left, right = text.split(",", 1)
                lo, hi = _edge(left), _edge(right)
                estimated = lo is None or hi is None
                if lo is None and hi is None:
                    mid = None
                elif lo is None:
                    mid = hi
                elif hi is None:
                    mid = lo
                else:
                    mid = (lo + hi) / 2
            else:
                # Exact bins: "40" (AMSR2) or "[1]" (ISS LIS) after the brackets are removed.
                mid = _edge(text)
        ref = int(attr("ref") or len(entries))
        entries.append(Entry(rgb=(rgb[0], rgb[1], rgb[2]), ref=ref, mid=mid, estimated=estimated, nodata=nodata))
    return entries, units


def decode_image(path: str, entries: list[Entry]) -> tuple[np.ndarray, float, int]:
    """Exact colormap lookup. Transparent and nodata pixels stay NaN."""
    usable = [entry for entry in entries if entry.mid is not None and not entry.nodata]
    image = np.asarray(Image.open(path).convert("RGBA"))
    rgb = image[..., :3]
    opaque_mask = image[..., 3] != 0
    opaque = int(opaque_mask.sum())
    values = np.full(rgb.shape[:2], np.nan, dtype=np.float32)
    hits = 0
    for entry in usable:
        red, green, blue = entry.rgb
        match = (
            opaque_mask
            & (rgb[..., 0] == red)
            & (rgb[..., 1] == green)
            & (rgb[..., 2] == blue)
        )
        count = int(match.sum())
        if count == 0 or entry.mid is None:
            continue
        values[match] = np.float32(entry.mid)
        hits += count
    rate = 1.0 if opaque == 0 else hits / opaque
    return values, rate, opaque


def area_weighted_mean(values: np.ndarray) -> float | None:
    height, _width = values.shape
    lats = 90 - (np.arange(height) + 0.5) / height * 180
    weights = np.cos(np.radians(lats))[:, None]
    mask = np.isfinite(values)
    if not mask.any():
        return None
    return float((np.where(mask, values, 0) * weights).sum() / (weights * mask).sum())


def lightning_seasons() -> list[dict[str, object]]:
    order: list[tuple[int, str]] = []
    for season in ("MAM", "JJA", "SON"):
        order.append((2017, season))
    for year in (2018, 2019, 2020):
        for season in ("DJF", "MAM", "JJA", "SON"):
            order.append((year, season))
    for season in ("DJF", "MAM", "JJA"):
        order.append((2021, season))
    windows = {"MAM": (4, 10), "JJA": (7, 10), "SON": (10, 10), "DJF": (1, 10)}
    out = []
    for year, season in order:
        month, day = windows[season]
        days = [f"{year}-{month:02d}-{day + offset:02d}" for offset in range(10)]
        out.append({"id": f"{year}-{season}", "n_days": None, "days": days})
    return out


BUDGETS = {
    "earth-day-2k-webp": 600_000,
    "value-texture": 300_000,
    "preview-webp": 250_000,
}


def check_budget(name: str, nbytes: int) -> None:
    limit = BUDGETS[name]
    if nbytes > limit:
        raise ValueError(f"{name} is {nbytes} bytes, budget is {limit}")


def wms_url(layer: str, width: int, height: int, fmt: str, when: str | None = None) -> str:
    """WMS GetMap. The date is the TIME parameter. STYLES stays empty.

    A previous version interpolated ``&TIME=...`` into the STYLES value
    (``STYLES={time}``). Query parsers then disagreed about whether the date
    belonged to STYLES or TIME. TIME is written as its own parameter.
    """
    query = (
        "SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0"
        f"&LAYERS={layer}&CRS=EPSG:4326&BBOX=-90,-180,90,180"
        f"&WIDTH={width}&HEIGHT={height}&FORMAT=image/{fmt}&STYLES="
    )
    if when:
        query += f"&TIME={when}"
    return "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?" + query


def etopo_sample(lat: float, lon: float, height_m: np.ndarray) -> float:
    rows, cols = height_m.shape
    y = int(np.clip((90 - lat) / 180 * rows, 0, rows - 1))
    x = int(np.clip((lon + 180) / 360 * cols, 0, cols - 1))
    return float(height_m[y, x])


def resample_block_mean(values: np.ndarray, out_h: int, out_w: int) -> np.ndarray:
    """Area-average a small grid. Used by the ETOPO tests, not as a substitute for GDAL on the full grid."""
    height, width = values.shape
    ys = np.linspace(0, height, out_h + 1).round().astype(int)
    xs = np.linspace(0, width, out_w + 1).round().astype(int)
    out = np.empty((out_h, out_w), dtype=np.float64)
    for i in range(out_h):
        block = values[ys[i] : max(ys[i + 1], ys[i] + 1)]
        row = block.mean(axis=0)
        sums = np.add.reduceat(row, xs[:-1])
        counts = np.diff(xs).astype(np.float64)
        out[i] = sums[:out_w] / np.maximum(counts[:out_w], 1)
    return out


def sha256_file(path: str) -> str:
    import hashlib

    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def region_mean(values: np.ndarray, bbox: tuple[float, float, float, float]) -> float | None:
    """Cosine-latitude weighted mean inside bbox (west, south, east, north)."""
    west, south, east, north = bbox
    height, width = values.shape
    x0 = max(0, math.floor((west + 180) / 360 * width))
    x1 = min(width, math.ceil((east + 180) / 360 * width))
    y0 = max(0, math.floor((90 - north) / 180 * height))
    y1 = min(height, math.ceil((90 - south) / 180 * height))
    if x1 <= x0 or y1 <= y0:
        return None
    block = values[y0:y1, x0:x1]
    rows = np.arange(y0, y1)
    latitudes = 90 - (rows + 0.5) / height * 180
    weights = np.cos(np.radians(latitudes)).astype(np.float64)[:, None]
    mask = np.isfinite(block)
    if not mask.any():
        return None
    weighted = np.where(mask, block.astype(np.float64), 0.0) * weights
    return float(weighted.sum() / (weights * mask).sum())
