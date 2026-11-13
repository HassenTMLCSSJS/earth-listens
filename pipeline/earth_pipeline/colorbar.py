"""CIELAB nearest-neighbour lookup for frame colorbars."""

from __future__ import annotations

import math


def _pivot(channel: float) -> float:
    value = channel / 255
    if value <= 0.04045:
        return value / 12.92
    return ((value + 0.055) / 1.055) ** 2.4


def rgb_to_lab(rgb: tuple[int, int, int]) -> tuple[float, float, float]:
    red, green, blue = (_pivot(rgb[0]), _pivot(rgb[1]), _pivot(rgb[2]))
    x = (red * 0.4124 + green * 0.3576 + blue * 0.1805) / 0.95047
    y = red * 0.2126 + green * 0.7152 + blue * 0.0722
    z = (red * 0.0193 + green * 0.1192 + blue * 0.9505) / 1.08883

    def f(t: float) -> float:
        return t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116

    return 116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))


def _delta(a: tuple[float, float, float], b: tuple[float, float, float]) -> float:
    return math.sqrt(sum((left - right) ** 2 for left, right in zip(a, b, strict=True)))


def build_lut(
    colorbar_rgb: list[tuple[int, int, int]],
    tick_values: list[float],
) -> list[tuple[tuple[int, int, int], float]]:
    if len(colorbar_rgb) != len(tick_values):
        raise ValueError("colorbar and ticks must be the same length")
    samples = []
    steps = 255
    for index in range(steps + 1):
        pos = index / steps * (len(colorbar_rgb) - 1)
        lo = math.floor(pos)
        hi = min(len(colorbar_rgb) - 1, math.ceil(pos))
        mix = pos - lo
        left = colorbar_rgb[lo]
        right = colorbar_rgb[hi]
        rgb = tuple(round(left[channel] + (right[channel] - left[channel]) * mix) for channel in range(3))
        value = tick_values[lo] + (tick_values[hi] - tick_values[lo]) * mix
        samples.append((rgb, value))
    return samples


def lookup(rgb: tuple[int, int, int], lut: list[tuple[tuple[int, int, int], float]]) -> float | None:
    lab = rgb_to_lab(rgb)
    grey = rgb_to_lab((rgb[0], rgb[0], rgb[0]))
    if max(rgb) - min(rgb) < 8 and _delta(lab, grey) < 6:
        return None
    best = min(lut, key=lambda item: _delta(lab, rgb_to_lab(item[0])))
    return best[1]
