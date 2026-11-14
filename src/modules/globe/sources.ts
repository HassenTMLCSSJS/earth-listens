import type { LayerId } from '@/core/actions';

/**
 * The eleven views the Guide documents: the ones in the listening legend.
 * `LAYER_SOURCE` is the short, human-readable provenance line shown next to
 * each view, mirroring the sources card in `mockups/guide.html`.
 */
export const GUIDE_LAYERS = [
  'temperature',
  'sea_ice',
  'forest',
  'precipitation',
  'co2',
  'aerosols',
  'lightning',
  'events',
  'air_quality',
  'wildfire',
  'ocean_sst',
] as const satisfies readonly LayerId[];

export type GuideLayer = (typeof GUIDE_LAYERS)[number];

export const LAYER_SOURCE: Record<GuideLayer, string> = {
  temperature: 'NASA GISTEMP v4 + MERRA-2 (GIBS)',
  sea_ice: 'NSIDC Sea Ice Index v4 + AMSR2 (GIBS)',
  forest: 'NASA GEDI L3 canopy height (GIBS)',
  precipitation: 'NASA GPM IMERG (GIBS)',
  co2: 'NOAA GML Mauna Loa + NASA AIRS (GIBS)',
  aerosols: 'NASA MERRA-2 AOD (GIBS)',
  lightning: 'ISS LIS flash count (GIBS)',
  events: 'NASA EONET v3 (live)',
  air_quality: 'NASA GEOS-CF + Open-Meteo (Cairo)',
  wildfire: 'NASA FIRMS VIIRS (sample history)',
  ocean_sst: 'GHRSST MUR L4 SST (GIBS)',
};
