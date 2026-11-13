import type { LayerId } from '@/core/actions';
import { changeRate, ticksForRate } from './math/rhythm';
import { clamp } from './math/round';
import type { EarconId } from './types';

export interface GestureInput {
  layerId: LayerId;
  value: number | null;
  strengthN: number;
  ticks: number;
  lowpassHz: number;
  freqHz: number;
  missing: boolean;
  /** Canopy standard deviation in metres, when the layer publishes it. */
  stddev?: number | null;
}

export interface Gesture {
  freqHz: number;
  ticks: number;
  lowpassHz: number;
  strengthN: number;
}

/**
 * Layer gestures on top of the existing engine.
 * A missing value stays silent (frequency 0, no ticks). Zero rain is silence too.
 * Temperature anomaly brightens the filter. Aerosol optical depth muffles it.
 */
export function gestureFor(input: GestureInput): Gesture {
  const silent = input.missing || input.value === null;
  const base: Gesture = {
    freqHz: silent ? 0 : input.freqHz,
    ticks: silent ? 0 : input.ticks,
    lowpassHz: input.lowpassHz,
    strengthN: input.strengthN,
  };
  if (silent || input.value === null) return base;
  const strength = clamp(input.strengthN, 0, 1);
  switch (input.layerId) {
    case 'temperature':
      return { ...base, lowpassHz: 600 + strength * 14000 };
    case 'aerosols':
      return { ...base, lowpassHz: 400 + (1 - strength) * 7600 };
    case 'precipitation':
      if (input.value <= 0) return { ...base, freqHz: 0, ticks: 0 };
      return { ...base, ticks: ticksForRate(changeRate(input.value, [0, 60])) };
    case 'lightning':
      return {
        ...base,
        ticks: ticksForRate(changeRate(Math.max(0, input.value), [0, 1])),
      };
    case 'wildfire':
      return {
        ...base,
        ticks: Math.max(base.ticks, ticksForRate(changeRate(Math.max(0, input.value), [0, 500]))),
      };
    case 'forest': {
      const chorus =
        input.stddev === null || input.stddev === undefined
          ? 0
          : Math.round(clamp(input.stddev / 20, 0, 1) * 3);
      return { ...base, ticks: 1 + Math.round(strength * 2) + chorus };
    }
    default:
      return base;
  }
}

/** Biomass loudness in the existing gain path. Null leaves the note unchanged. */
export function biomassLoudness(megagramsPerHa: number | null): number {
  if (megagramsPerHa === null || !Number.isFinite(megagramsPerHa)) return 1;
  return 0.5 + 0.5 * clamp(megagramsPerHa / 300, 0, 1);
}

/** Higher sea-ice extent is a higher pitch. Shrinking ice descends. */
export function icePitchDescends(lowExtentHz: number, highExtentHz: number): boolean {
  return highExtentHz > lowExtentHz;
}

export function earconForCategory(category: string): EarconId {
  const text = category.toLowerCase();
  if (text.includes('fire')) return 'fire';
  if (text.includes('volcano')) return 'volcano';
  if (text.includes('storm') || text.includes('cyclone')) return 'storm';
  if (text.includes('ice')) return 'ice';
  if (text.includes('flood')) return 'flood';
  return 'event';
}

export interface PassMarker {
  id: string;
  category: string;
  lon: number;
}

/** Earcons as the playhead sweeps longitude. At most one every 1/3 second. */
export function eventPasses(
  markers: readonly PassMarker[],
  duration: number,
): { t: number; id: EarconId }[] {
  const sorted = markers
    .slice()
    .sort((a, b) => a.lon - b.lon || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const minGap = 1 / 3;
  let last = -minGap;
  const out: { t: number; id: EarconId }[] = [];
  for (const marker of sorted) {
    const along = ((marker.lon + 180) / 360) * duration;
    const t = Math.max(0, Math.max(along, last + minGap));
    if (t > duration + 1e-9) break;
    last = t;
    out.push({ t, id: earconForCategory(marker.category) });
  }
  return out;
}
