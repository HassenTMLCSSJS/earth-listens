import type { LayerId } from '@/core/actions';

export interface TimbrePreset {
  id: 'warm-lead' | 'crackle-marimba' | 'glass-bells' | 'beating-drone';
  layerId: LayerId;
}

export const TIMBRE_PRESETS: Record<LayerId, TimbrePreset> = {
  temperature: { id: 'warm-lead', layerId: 'temperature' },
  wildfire: { id: 'crackle-marimba', layerId: 'wildfire' },
  sea_ice: { id: 'glass-bells', layerId: 'sea_ice' },
  co2: { id: 'beating-drone', layerId: 'co2' },
};
