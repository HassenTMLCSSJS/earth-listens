import type { Speed } from '@/core/actions';
import { STEP_SEC } from '../constants';
import { clamp } from './round';

export function changeRate(delta: number | null, range: readonly [number, number]): number {
  if (delta === null || !Number.isFinite(delta)) return 0;
  const dMax = Math.max(Math.abs(range[0]), Math.abs(range[1]));
  if (dMax === 0) return 0;
  return clamp(Math.abs(delta) / dMax, 0, 1);
}

export function ticksForRate(r: number): number {
  return 1 + Math.floor(3 * r + 0.5);
}

export function bpmForRate(r: number): number {
  return 60 + 120 * r;
}

export function periodForRate(r: number): number {
  return 60 / bpmForRate(r);
}

export function stepSeconds(speed: Speed): number {
  return STEP_SEC[speed];
}
