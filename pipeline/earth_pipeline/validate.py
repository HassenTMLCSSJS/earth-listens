"""Pearson check and an SVG plot. The committed plot is a SAMPLE self-check, not a NASA validation."""

from __future__ import annotations

import math
from pathlib import Path


def pearson(left: list[float], right: list[float]) -> float:
    if len(left) != len(right) or len(left) < 2:
        raise ValueError("need two equal series")
    mean_l = sum(left) / len(left)
    mean_r = sum(right) / len(right)
    num = sum((a - mean_l) * (b - mean_r) for a, b in zip(left, right, strict=True))
    den_l = math.sqrt(sum((a - mean_l) ** 2 for a in left))
    den_r = math.sqrt(sum((b - mean_r) ** 2 for b in right))
    if den_l == 0 or den_r == 0:
        return 1.0 if left == right else 0.0
    return num / (den_l * den_r)


def write_svg(path: Path, series: list[float], title: str) -> None:
    width, height = 320, 120
    lo, hi = min(series), max(series)
    span = hi - lo or 1
    points = []
    for index, value in enumerate(series):
        x = 20 + index * ((width - 40) / max(1, len(series) - 1))
        y = height - 20 - ((value - lo) / span) * (height - 40)
        points.append(f"{x:.1f},{y:.1f}")
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" role="img">
  <title>{title}</title>
  <rect width="100%" height="100%" fill="#05070d"/>
  <polyline fill="none" stroke="#5ad1ff" stroke-width="2" points="{' '.join(points)}"/>
  <text x="16" y="24" fill="#ffd34d" font-size="14">SAMPLE</text>
</svg>
"""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(svg, encoding="utf-8")


def main() -> None:
    series = [0.0, 0.2, 0.5, 0.8, 1.1]
    score = pearson(series, [value + 0.01 for value in series])
    root = Path(__file__).resolve().parents[2]
    write_svg(root / "docs" / "validation" / "sample-check.svg", series, "SAMPLE pipeline self-check")
    print(f"SAMPLE pearson {score:.6f}")
    if score < 0.9:
        raise SystemExit("sample self-check fell below 0.9")


if __name__ == "__main__":
    main()
