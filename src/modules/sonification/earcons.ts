import type { EarconId } from './types';
import { hashString } from '@/core/prng';

export interface EarconSpec {
  id: EarconId;
  ms: number;
  gainDb: number;
  freqs: number[];
  wave: 'sine' | 'triangle' | 'square';
}

/** Fixed, seeded earcons. No Math.random and no Tone.Noise. */
export const EARCONS: Record<EarconId, EarconSpec> = {
  start: { id: 'start', ms: 180, gainDb: -12, freqs: [523.25, 659.25], wave: 'sine' },
  stop: { id: 'stop', ms: 140, gainDb: -12, freqs: [392, 261.63], wave: 'sine' },
  layer_added: { id: 'layer_added', ms: 160, gainDb: -12, freqs: [587.33], wave: 'triangle' },
  region_changed: {
    id: 'region_changed',
    ms: 120,
    gainDb: -12,
    freqs: [440, 554.37],
    wave: 'sine',
  },
  record: { id: 'record', ms: 220, gainDb: -12, freqs: [880, 1174.66], wave: 'sine' },
  missing: { id: 'missing', ms: 200, gainDb: -18, freqs: [180], wave: 'triangle' },
  out_of_range: { id: 'out_of_range', ms: 90, gainDb: -14, freqs: [1400], wave: 'square' },
  quiz_correct: {
    id: 'quiz_correct',
    ms: 260,
    gainDb: -12,
    freqs: [523.25, 659.25, 783.99],
    wave: 'sine',
  },
  quiz_wrong: { id: 'quiz_wrong', ms: 220, gainDb: -12, freqs: [311.13, 233.08], wave: 'sine' },
  listening: { id: 'listening', ms: 120, gainDb: -12, freqs: [698.46], wave: 'sine' },
  error: { id: 'error', ms: 240, gainDb: -12, freqs: [196, 185], wave: 'square' },
};

export function crackleSeed(): number {
  return hashString('wildfire');
}
