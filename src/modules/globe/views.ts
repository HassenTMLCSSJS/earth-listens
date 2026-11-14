import type { LayerId } from '@/core/actions';
import { REGIONS } from '@/modules/data';

export interface GlobePoint {
  lat: number;
  lng: number;
  altitude: number;
  radius: number;
  color: string;
  label: string;
}

export interface GlobeArc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
}

export interface GlobeView {
  points: GlobePoint[];
  rings: { lat: number; lng: number; color: string }[];
  arcs: GlobeArc[];
}

export interface SeriesPoint {
  t: number | string;
  v: number | null;
}

export interface ViewInput {
  id: LayerId;
  cursor: number;
  series: Partial<Record<string, SeriesPoint[]>>;
  markers?: { lat: number; lon: number; title: string; t: string }[];
  cells?: { lat: number; lon: number; t: string; count: number }[];
  focus: { lat: number; lon: number };
}

/** What each data view sounds like. Egyptian Arabic, same mapping as the score. */
export const LAYER_SOUND: Record<LayerId, { en: string; ar: string }> = {
  temperature: { en: 'Warm lead. Higher means warmer.', ar: 'لحن دافي. كل ما يعلى يبقى أسخن.' },
  sea_ice: {
    en: 'Glass bells. Higher means more ice.',
    ar: 'أجراس إزاز. كل ما تعلى يبقى الجليد أكتر.',
  },
  forest: {
    en: 'Soft woodwind. Higher means a taller canopy.',
    ar: 'نفخ هادي. كل ما يعلى يبقى الشجر أطول.',
  },
  precipitation: {
    en: 'Rain ticks. Faster means more rain.',
    ar: 'تكات مطر. كل ما تسرع يبقى المطر أكتر.',
  },
  co2: {
    en: 'Low beating drone. Higher means more carbon dioxide.',
    ar: 'همهمة واطية بتنبض. كل ما تعلى يبقى الكربون أكتر.',
  },
  aerosols: {
    en: 'Hazy pad. Louder means thicker air.',
    ar: 'طبقة ضباب. كل ما تعلى يبقى الهوا أتقل.',
  },
  lightning: {
    en: 'Sharp cracks. More hits mean more lightning.',
    ar: 'طرقعات حادة. كل ما تكتر يبقى البرق أكتر.',
  },
  events: {
    en: 'A short ping for each NASA EONET event, from where it happens.',
    ar: 'نبرة قصيرة لكل حدث من EONET بتاع ناسا، من مكانه.',
  },
  air_quality: {
    en: 'Tight pulse. Higher means dirtier air.',
    ar: 'نبض ضيق. كل ما يعلى يبقى الهوا أوسخ.',
  },
  wildfire: {
    en: 'Crackle. Louder means a stronger fire.',
    ar: 'طقطقة. كل ما تعلى تبقى النار أقوى.',
  },
  ocean_sst: {
    en: 'Slow swell. Higher means warmer water.',
    ar: 'موج بطيء. كل ما يعلى تبقى المية أسخن.',
  },
  ocean_currents: { en: 'A sweep that follows the current.', ar: 'سريان ماشي مع التيار.' },
  night_lights: {
    en: 'Bright chime. Higher means brighter nights.',
    ar: 'رنة منورة. كل ما تعلى يبقى الليل أنور.',
  },
};

export const LAYER_COLOR: Record<LayerId, string> = {
  temperature: '#ff7a45',
  sea_ice: '#bfe9ff',
  forest: '#7dffb3',
  precipitation: '#5ad1ff',
  co2: '#b48cff',
  aerosols: '#d9d3c5',
  lightning: '#ffe56a',
  events: '#ffd34d',
  air_quality: '#ff9b71',
  wildfire: '#ff4d2e',
  ocean_sst: '#3d9eff',
  ocean_currents: '#6ec8ff',
  night_lights: '#fff4c2',
};

function valueAt(points: SeriesPoint[] | undefined, cursor: number): number | null {
  if (!points || points.length === 0) return null;
  const numeric = points.filter(
    (point): point is { t: number; v: number | null } => typeof point.t === 'number',
  );
  if (numeric.length === 0) return points[0]?.v ?? null;
  const past = numeric.filter((point) => point.t <= cursor);
  return (past.at(-1) ?? numeric[0])?.v ?? null;
}

function radiusFor(value: number | null, points: SeriesPoint[] | undefined): number {
  const values = (points ?? []).flatMap((point) => (typeof point.v === 'number' ? [point.v] : []));
  if (value === null || values.length === 0) return 0.28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return 0.16 + ((value - min) / span) * 0.55;
}

function centre(id: string): { lat: number; lon: number } | null {
  const region = REGIONS.find((item) => item.id === id);
  if (!region) return null;
  return { lat: region.centre[0], lon: region.centre[1] };
}

export function viewForLayer(input: ViewInput): GlobeView {
  const color = LAYER_COLOR[input.id];
  const points: GlobePoint[] = [];

  const year = Math.trunc(input.cursor);
  const cells = (input.cells ?? []).filter((cell) => cell.t.startsWith(String(year)));
  const cellPool = cells.length > 0 ? cells : (input.cells ?? []);
  if (input.id === 'wildfire' || (input.id === 'lightning' && cellPool.length > 0)) {
    for (const cell of cellPool.slice(0, 80)) {
      points.push({
        lat: cell.lat,
        lng: cell.lon,
        altitude: 0.01,
        radius: Math.min(0.7, 0.12 + cell.count / 40),
        color,
        label: `${input.id} ${cell.t}`,
      });
    }
  }

  if (points.length === 0 && (input.markers?.length ?? 0) > 0) {
    for (const marker of (input.markers ?? []).slice(0, 80)) {
      points.push({
        lat: marker.lat,
        lng: marker.lon,
        altitude: 0.02,
        radius: 0.32,
        color,
        label: marker.title,
      });
    }
  }

  if (points.length === 0) {
    const entries = Object.entries(input.series);
    for (const [region, series] of entries) {
      const place = centre(region) ?? input.focus;
      const value = valueAt(series, input.cursor);
      points.push({
        lat: place.lat,
        lng: place.lon,
        altitude: 0.01,
        radius: radiusFor(value, series),
        color,
        label: region,
      });
    }
  }

  if (points.length === 0 && input.id === 'air_quality') {
    points.push({
      lat: 30.04,
      lng: 31.24,
      altitude: 0.02,
      radius: 0.34,
      color,
      label: 'Cairo',
    });
  }

  if (points.length === 0) {
    points.push({
      lat: input.focus.lat,
      lng: input.focus.lon,
      altitude: 0.01,
      radius: 0.24,
      color,
      label: input.id,
    });
  }

  const focus = points[0] ?? { lat: input.focus.lat, lng: input.focus.lon, color };
  const arcs: GlobeArc[] =
    input.id === 'ocean_currents'
      ? [
          { startLat: 10, startLng: -40, endLat: 30, endLng: -20, color },
          { startLat: -20, startLng: 60, endLat: -40, endLng: 100, color },
          { startLat: 20, startLng: 120, endLat: 40, endLng: 160, color },
        ]
      : [];

  return {
    points,
    rings: [{ lat: focus.lat, lng: focus.lng, color }],
    arcs,
  };
}
