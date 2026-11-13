import { clamp } from './round';

export interface NormResult {
  n: number | null;
  outOfRange: boolean;
}

/** Hyndman–Fan type 7 percentile. `sorted` must be finite and ascending. */
export function percentileLinear(sorted: readonly number[], p: number): number {
  const n = sorted.length;
  if (n === 0) return Number.NaN;
  const first = sorted[0];
  if (n === 1 || first === undefined) return first ?? Number.NaN;
  const h = ((n - 1) * p) / 100;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  const a = sorted[lo] ?? first;
  const b = sorted[hi] ?? a;
  return a + (h - lo) * (b - a);
}

export function robustBounds(
  values: readonly number[],
  pLow: number,
  pHigh: number,
): { lo: number; hi: number } {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length < 2) {
    const only = sorted[0] ?? 0;
    return { lo: only, hi: only };
  }
  return { lo: percentileLinear(sorted, pLow), hi: percentileLinear(sorted, pHigh) };
}

export function normalizeMinMax(
  v: number | null | undefined,
  min: number,
  max: number,
): NormResult {
  if (v === null || v === undefined || !Number.isFinite(v)) return { n: null, outOfRange: false };
  if (max === min) return { n: 0.5, outOfRange: v < min || v > max };
  const outOfRange = v < min || v > max;
  return { n: clamp((v - min) / (max - min), 0, 1), outOfRange };
}

export function normalizeRobust(
  v: number | null | undefined,
  values: readonly number[],
  pLow = 5,
  pHigh = 95,
): NormResult {
  if (v === null || v === undefined || !Number.isFinite(v)) return { n: null, outOfRange: false };
  const { lo, hi } = robustBounds(values, pLow, pHigh);
  if (hi === lo) return { n: 0.5, outOfRange: false };
  const outOfRange = v < lo || v > hi;
  return { n: clamp((v - lo) / (hi - lo), 0, 1), outOfRange };
}
