import type { QuizAnswer } from '@/core/actions';

export interface TruthPoint {
  t: number | string;
  v: number | null;
}

function numericTime(value: number | string): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Ordinary least squares slope, scaled by the clip span and the value range. */
export function groundTruth(
  points: readonly TruthPoint[],
  range: { min: number; max: number },
  threshold = 0.05,
): QuizAnswer {
  const width = range.max - range.min;
  const rows = points.flatMap((point) => {
    const t = numericTime(point.t);
    if (t === null || point.v === null || !Number.isFinite(point.v)) return [];
    return [{ t, v: point.v }];
  });
  const first = points[0];
  const last = points[points.length - 1];
  const tStart = first ? numericTime(first.t) : null;
  const tEnd = last ? numericTime(last.t) : null;
  if (rows.length < 2 || width === 0 || tStart === null || tEnd === null) return 'unchanged';
  const meanT = rows.reduce((sum, row) => sum + row.t, 0) / rows.length;
  const meanV = rows.reduce((sum, row) => sum + row.v, 0) / rows.length;
  let num = 0;
  let den = 0;
  for (const row of rows) {
    num += (row.t - meanT) * (row.v - meanV);
    den += (row.t - meanT) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const s = (slope * (tEnd - tStart)) / width;
  if (Math.abs(s) < threshold) return 'unchanged';
  return s > 0 ? 'increased' : 'decreased';
}
