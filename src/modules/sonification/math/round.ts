export function r6(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const v = Math.round(n * 1e6) / 1e6;
  return Object.is(v, -0) ? 0 : v;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
