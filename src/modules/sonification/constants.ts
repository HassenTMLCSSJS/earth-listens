import type { LayerId, ScaleId, Speed } from '@/core/actions';

/** Earth Sonification Language constants. Mirrored in docs/SONIFICATION.md. */
export const STEP_SEC: Record<Speed, number> = { slow: 0.6, normal: 0.3, fast: 0.15 };

export const DWELL_SEC = 8;
export const COMPARE_SEC = 2;
export const COMPARE_GAP_SEC = 0.5;
export const NOTE_DUTY = 0.9;

export const STRENGTH_DB_LO = -30;
export const STRENGTH_DB_SPAN = 24;
export const GAIN_CEILING_DB = -6;
export const MASTER_MIN_DB = -40;
export const MASTER_MAX_DB = 0;
export const EARCON_DB = -12;
export const SYMPHONY_LAYERS = 4;

export const QUANTIZE_EPS = 1e-9;

export interface ScaleDef {
  tonicPc: number;
  /** Cents above the tonic, microtonal (24-TET neutral intervals where noted). */
  micro: readonly number[];
  /** 12-TET fallback degrees in cents. */
  tet: readonly number[];
}

export const SCALES: Record<ScaleId, ScaleDef> = {
  pentatonic_major: { tonicPc: 0, micro: [0, 200, 400, 700, 900], tet: [0, 200, 400, 700, 900] },
  major: {
    tonicPc: 0,
    micro: [0, 200, 400, 500, 700, 900, 1100],
    tet: [0, 200, 400, 500, 700, 900, 1100],
  },
  chromatic: {
    tonicPc: 0,
    micro: [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100],
    tet: [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100],
  },
  maqam_rast: {
    tonicPc: 0,
    micro: [0, 200, 350, 500, 700, 900, 1050],
    tet: [0, 200, 400, 500, 700, 900, 1000],
  },
  maqam_bayati: {
    tonicPc: 2,
    micro: [0, 150, 300, 500, 700, 800, 1000],
    tet: [0, 100, 300, 500, 700, 800, 1000],
  },
  maqam_hijaz: {
    tonicPc: 2,
    micro: [0, 100, 400, 500, 700, 800, 1000],
    tet: [0, 100, 400, 500, 700, 800, 1000],
  },
  maqam_nahawand: {
    tonicPc: 0,
    micro: [0, 200, 300, 500, 700, 800, 1100],
    tet: [0, 200, 300, 500, 700, 800, 1100],
  },
};

export const LAYER_REGISTERS: Record<
  LayerId,
  { solo: [number, number]; symphony: [number, number] }
> = {
  temperature: { solo: [48, 84], symphony: [48, 67] },
  wildfire: { solo: [60, 84], symphony: [69, 81] },
  sea_ice: { solo: [72, 96], symphony: [84, 96] },
  co2: { solo: [36, 43], symphony: [36, 43] },
  night_lights: { solo: [52, 88], symphony: [60, 84] },
  ocean_sst: { solo: [48, 84], symphony: [55, 72] },
  ocean_currents: { solo: [40, 64], symphony: [40, 60] },
  aerosols: { solo: [55, 86], symphony: [60, 84] },
  air_quality: { solo: [52, 84], symphony: [55, 79] },
  lightning: { solo: [72, 96], symphony: [84, 96] },
  forest: { solo: [48, 72], symphony: [55, 67] },
  precipitation: { solo: [60, 84], symphony: [64, 79] },
  events: { solo: [60, 84], symphony: [60, 79] },
};

export const SAMPLE_RANGES: Record<LayerId, { min: number; max: number; unit: string }> = {
  temperature: { min: -0.6, max: 1.4, unit: '°C anomaly vs 1951–1980' },
  wildfire: { min: 0, max: 500, unit: 'detections per 5° cell per day' },
  sea_ice: { min: 3, max: 8, unit: 'million km²' },
  co2: { min: 310, max: 440, unit: 'ppm' },
  night_lights: {
    min: 5.51,
    max: 51.75,
    unit: 'night brightness index (image-derived, not calibrated radiance)',
  },
  ocean_sst: { min: -2, max: 32, unit: '°C' },
  ocean_currents: { min: 0, max: 1, unit: 'frame step (no numeric speed)' },
  aerosols: { min: 0, max: 5, unit: 'AOD' },
  air_quality: { min: 0, max: 75, unit: 'µg/m³' },
  lightning: { min: 0, max: 1, unit: 'flash-rate index' },
  forest: { min: 0, max: 40, unit: 'canopy height, m' },
  precipitation: { min: 0, max: 60, unit: 'precipitation rate, mm/day' },
  events: { min: 0, max: 50, unit: 'events per year' },
};

export const TIMBRES = {
  temperature: 'warm-lead',
  wildfire: 'crackle-marimba',
  sea_ice: 'glass-bells',
  co2: 'beating-drone',
  night_lights: 'night-bell',
  ocean_sst: 'water-fm',
  ocean_currents: 'water-fm',
  aerosols: 'grain-pad',
  air_quality: 'aq-chord',
  lightning: 'thunder-perc',
  forest: 'grain-pad',
  precipitation: 'water-fm',
  events: 'thunder-perc',
} as const;

export const GLOBAL_POSITION = { x: 0, y: 0, z: -1 } as const;
