import type { ScaleId, TuningMode } from '@/core/actions';
import { QUANTIZE_EPS, SCALES } from '../constants';

const gridCache = new Map<string, number[]>();

export function midiFromNorm(n: number, register: readonly [number, number]): number {
  return register[0] + n * (register[1] - register[0]);
}

export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function scaleGrid(
  scale: ScaleId,
  tuning: TuningMode,
  register: readonly [number, number],
): number[] {
  const key = `${scale}|${tuning}|${register[0]}|${register[1]}`;
  const cached = gridCache.get(key);
  if (cached) return cached;
  const def = SCALES[scale];
  const cents = tuning === 'twelve_tet' ? def.tet : def.micro;
  const [lo, hi] = register;
  const notes: number[] = [];
  for (let k = -1; k <= 10; k += 1) {
    for (const c of cents) {
      const midi = def.tonicPc + 12 * k + c / 100;
      if (midi >= lo - QUANTIZE_EPS && midi <= hi + QUANTIZE_EPS) notes.push(midi);
    }
  }
  notes.sort((a, b) => a - b);
  const unique: number[] = [];
  for (const note of notes) {
    const prev = unique[unique.length - 1];
    if (prev === undefined || Math.abs(note - prev) > QUANTIZE_EPS) unique.push(note);
  }
  gridCache.set(key, unique);
  return unique;
}

/** Nearest scale degree. Ties (within 1e-9) resolve to the lower note. Endpoints clamp. */
export function quantize(
  midiRaw: number,
  scale: ScaleId,
  tuning: TuningMode,
  register: readonly [number, number],
): number {
  const grid = scaleGrid(scale, tuning, register);
  const lowest = grid[0];
  const highest = grid[grid.length - 1];
  if (lowest === undefined || highest === undefined) return midiRaw;
  if (midiRaw <= lowest) return lowest;
  if (midiRaw >= highest) return highest;
  let best = lowest;
  let bestDist = Math.abs(lowest - midiRaw);
  for (const note of grid) {
    const dist = Math.abs(note - midiRaw);
    const closer = dist < bestDist - QUANTIZE_EPS;
    const tieLower = Math.abs(dist - bestDist) <= QUANTIZE_EPS && note < best;
    if (closer || tieLower) {
      best = note;
      bestDist = dist;
    }
  }
  return best;
}
