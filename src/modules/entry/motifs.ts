export interface MotifNote {
  pitch: number;
  at: number;
}

/** Map a series onto a rising register. Same numbers in, same notes out. */
export function temperatureMotif(values: number[]): MotifNote[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values.map((value, index) => ({
    pitch: 48 + ((value - min) / span) * 24,
    at: index / Math.max(1, values.length - 1),
  }));
}

export function forestMotif(heights: number[]): MotifNote[] {
  return heights.map((height, index) => ({
    pitch: 55 + Math.max(0, Math.min(24, height / 2)),
    at: index / Math.max(1, heights.length),
  }));
}

export function co2Motif(ppm: number[]): MotifNote[] {
  return ppm.map((value, index) => ({
    pitch: 40 + Math.max(0, Math.min(30, (value - 280) / 6)),
    at: index / Math.max(1, ppm.length - 1),
  }));
}

export function movingAverage(values: number[], window: number): number[] {
  if (window <= 1) return values.slice();
  return values.map((_, index) => {
    const start = Math.max(0, index - window + 1);
    const slice = values.slice(start, index + 1);
    return slice.reduce((sum, value) => sum + value, 0) / slice.length;
  });
}
