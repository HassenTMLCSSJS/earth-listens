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
            body = source.strip()[1:-1]
            left, right = body.split(",")
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
        ref = int(attr("ref") or len(entries))
        entries.append(Entry(rgb=(rgb[0], rgb[1], rgb[2]), ref=ref, mid=mid, estimated=estimated, nodata=nodata))
    return entries, units


def decode_image(path: str, entries: list[Entry]) -> tuple[np.ndarray, float, int]:
    lut = {entry.rgb: entry for entry in entries if entry.mid is not None and not entry.nodata}
    image = np.asarray(Image.open(path).convert("RGBA"))
    height, width, _ = image.shape
    values = np.full((height, width), np.nan, dtype=np.float32)
    opaque = 0
    hits = 0
    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = (int(channel) for channel in image[y, x])
            if alpha == 0:
                continue
            opaque += 1
            entry = lut.get((red, green, blue))
            if entry is None or entry.mid is None:
                continue
            hits += 1
            values[y, x] = entry.mid
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
    time = f"&TIME={when}" if when else ""
    return (
        "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap"
        f"&VERSION=1.3.0&LAYERS={layer}&CRS=EPSG:4326&BBOX=-90,-180,90,180"
        f"&WIDTH={width}&HEIGHT={height}&FORMAT=image/{fmt}&STYLES={time}"
    )


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
    west, south, east, north = bbox
    height, width = values.shape
    x0 = max(0, math.floor((west + 180) / 360 * width))
    x1 = min(width, math.ceil((east + 180) / 360 * width))
    y0 = max(0, math.floor((90 - north) / 180 * height))
    y1 = min(height, math.ceil((90 - south) / 180 * height))
    num = 0.0
    den = 0.0
    for y in range(y0, y1):
        lat = 90 - (y + 0.5) / height * 180
        weight = math.cos(math.radians(lat))
        for x in range(x0, x1):
            value = float(values[y, x])
            if not math.isfinite(value):
                continue
            num += value * weight
            den += weight
    if den == 0:
        return None
    return num / den
