import type { RegionId } from '@/core/actions';
import type { LayerData, LoadedLayer, Point, Region } from './schemas';

export function seriesFor(layer: LoadedLayer, region: RegionId): Point[] {
  return (layer.data.series[region] ?? layer.data.series.global ?? []).slice();
}

export function regionById(regions: readonly Region[], id: RegionId): Region {
  const found = regions.find((region) => region.id === id);
  if (!found) throw new Error(`Unknown region ${id}`);
  return found;
}

export function areaWeightedMean(
  lats: readonly number[],
  values: readonly (number | null)[],
): number | null {
  let num = 0;
  let den = 0;
  for (let i = 0; i < lats.length; i += 1) {
    const lat = lats[i];
    const value = values[i];
    if (lat === undefined || value === null || value === undefined || !Number.isFinite(value))
      continue;
    const weight = Math.cos((lat * Math.PI) / 180);
    num += weight * value;
    den += weight;
  }
  if (den === 0) return null;
  return num / den;
}

export function fireCell(lat: number, lon: number): { lat: number; lon: number } {
  const axis = (value: number, limit: number) => {
    const edge = Math.floor(value / 5) * 5 + 2.5;
    return Math.min(limit, Math.max(-limit, edge));
  };
  return { lat: axis(lat, 87.5), lon: axis(lon, 177.5) };
}

export function finitePoints(points: readonly Point[]): Point[] {
  return points.filter((point) => point.v !== null && Number.isFinite(point.v));
}

export type { LayerData };
