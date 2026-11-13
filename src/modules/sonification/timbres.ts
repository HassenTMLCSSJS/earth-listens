import type { LayerId } from '@/core/actions';
import { TIMBRE_IDS } from '@/modules/data';

export type TimbreId = (typeof TIMBRE_IDS)[number];

export interface TimbrePreset {
  id: TimbreId;
  layerId: LayerId;
}

export const TIMBRE_PRESETS: Record<LayerId, TimbrePreset> = {
  temperature: { id: 'warm-lead', layerId: 'temperature' },
  wildfire: { id: 'crackle-marimba', layerId: 'wildfire' },
  sea_ice: { id: 'glass-bells', layerId: 'sea_ice' },
  co2: { id: 'beating-drone', layerId: 'co2' },
  night_lights: { id: 'night-bell', layerId: 'night_lights' },
  ocean_sst: { id: 'water-fm', layerId: 'ocean_sst' },
  ocean_currents: { id: 'water-fm', layerId: 'ocean_currents' },
  aerosols: { id: 'grain-pad', layerId: 'aerosols' },
  air_quality: { id: 'aq-chord', layerId: 'air_quality' },
  lightning: { id: 'thunder-perc', layerId: 'lightning' },
  forest: { id: 'grain-pad', layerId: 'forest' },
  precipitation: { id: 'water-fm', layerId: 'precipitation' },
  events: { id: 'thunder-perc', layerId: 'events' },
};

const SPECIES_TIMBRE: Record<string, TimbreId> = {
  sea_salt: 'air-flute',
  dust: 'grain-pad',
  smoke: 'low-brass',
  sulfate: 'glass-bells',
  pm25: 'grain-pad',
  o3: 'air-flute',
  co: 'low-brass',
  nox: 'glass-bells',
};

/** Layer preset, unless the voice id names a species or pollutant. */
export function timbreFor(layerId: LayerId, voiceId: string): TimbreId {
  const species = voiceId.split(':')[1];
  if (species && SPECIES_TIMBRE[species]) return SPECIES_TIMBRE[species];
  return TIMBRE_PRESETS[layerId].id;
}
