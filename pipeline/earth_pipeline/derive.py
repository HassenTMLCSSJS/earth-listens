"""Quantize a decoded grid. No network."""

from __future__ import annotations

import base64

import numpy as np


def quantize(values: np.ndarray) -> tuple[np.ndarray, float, float]:
    """Map finite values onto bytes 0..254. 255 is nodata.

    scale and offset reconstruct a value as ``offset + byte * scale``.
    The endpoints are the min and max of the finite samples in this array.
    """
    raw = np.full(values.shape, 255, dtype=np.uint8)
    finite = np.isfinite(values)
    if not finite.any():
        return raw, 1.0, 0.0
    lo = float(np.min(values[finite]))
    hi = float(np.max(values[finite]))
    if hi == lo:
        raw[finite] = 0
        return raw, 1.0, lo
    scale = (hi - lo) / 254.0
    coded = np.clip(np.rint((values - lo) / scale), 0, 254)
    raw[finite] = coded[finite].astype(np.uint8)
    return raw, float(scale), lo


def block_nanmean(values: np.ndarray, out_h: int, out_w: int) -> np.ndarray:
    """Mean of finite samples in each block. A block of only nodata stays NaN."""
    height, width = values.shape
    ys = np.linspace(0, height, out_h + 1).round().astype(int)
    xs = np.linspace(0, width, out_w + 1).round().astype(int)
    out = np.full((out_h, out_w), np.nan, dtype=np.float32)
    for i in range(out_h):
        y1 = max(int(ys[i + 1]), int(ys[i]) + 1)
        row = values[int(ys[i]) : y1]
        for j in range(out_w):
            x1 = max(int(xs[j + 1]), int(xs[j]) + 1)
            block = row[:, int(xs[j]) : x1]
            if np.isfinite(block).any():
                out[i, j] = float(np.nanmean(block))
    return out


def grid_document(
    values: np.ndarray,
    *,
    layer: str,
    when: str,
    units: str,
    sha256: str,
    source_url: str,
) -> dict[str, object]:
    raw, scale, offset = quantize(values)
    return {
        "layer": layer,
        "t": when,
        "w": int(values.shape[1]),
        "h": int(values.shape[0]),
        "units": units,
        "scale": scale,
        "offset": offset,
        "nodata": 255,
        "encoding": "uint8-base64",
        "data": base64.b64encode(raw.tobytes()).decode("ascii"),
        "sha256": sha256,
        "source": source_url,
        "sample": False,
    }
