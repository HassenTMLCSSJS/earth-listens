import type { LayerId } from '@/core/actions';
import type { FeedEnvelope, LayerData, LoadedLayer, Point } from './schemas';

type Marker = NonNullable<LayerData['markers']>[number];

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function numberField(item: unknown, ...keys: string[]): number | null {
  if (!item || typeof item !== 'object') return null;
  const row = item as Record<string, unknown>;
  for (const key of keys) {
    const value = row[key];
    if (finite(value)) return value;
  }
  return null;
}

function textField(item: unknown, key: string): string | null {
  if (!item || typeof item !== 'object') return null;
  const value = (item as Record<string, unknown>)[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** A fractional year for a date or timestamp: 2026-07-02 → 2026.5. */
export function fractionalYear(iso: string | undefined | null): number | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (![year, month, day].every(Number.isFinite)) return null;
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  const at = Date.UTC(year, month - 1, day);
  return year + (at - start) / (end - start);
}

/**
 * Append the newest point, or replace a point with the same time. Older values
 * are never rewritten, and the caller can safely pass the same envelope twice.
 */
export function upsertPoint(points: readonly Point[], point: Point): Point[] {
  const next = points.slice();
  const last = next.at(-1);
  if (!last) return [point];
  if (typeof point.t === 'number' && typeof last.t === 'number') {
    if (point.t === last.t) {
      next[next.length - 1] = point;
      return next;
    }
    if (point.t > last.t) {
      next.push(point);
      return next;
    }
    const index = next.findIndex((item) => item.t === point.t);
    if (index >= 0) next[index] = point;
    return next;
  }
  const lastKey = String(last.t);
  const key = String(point.t);
  if (key === lastKey) {
    next[next.length - 1] = point;
  } else if (key > lastKey) {
    next.push(point);
  }
  return next;
}

function withSeries(data: LayerData, region: keyof LayerData['series'], point: Point): LayerData {
  const series = data.series[region];
  if (!series) return data;
  const next = upsertPoint(series, point);
  const max = typeof point.t === 'number' ? Math.max(data.range.max, point.t) : data.range.max;
  return {
    ...data,
    series: { ...data.series, [region]: next },
    range: { min: data.range.min, max },
  };
}

function yearOf(envelope: FeedEnvelope, fallback: number | null = null): number | null {
  const year = fractionalYear(envelope.dataTime);
  return year === null ? fallback : year;
}

function pointAt(t: number, v: number, q: Point['q'] = 'ok'): Point {
  return { t, v, q };
}

function temperature(data: LayerData, envelope: FeedEnvelope): LayerData {
  const item = envelope.items?.[0];
  const year = numberField(item, 'year');
  const value = numberField(item, 'value', 'v');
  if (year === null || value === null) return data;
  return withSeries(data, 'global', pointAt(year, value));
}

function co2(data: LayerData, envelope: FeedEnvelope): LayerData {
  const item = envelope.items?.[0];
  const year = numberField(item, 'year');
  const value = numberField(item, 'ppm', 'average', 'value');
  if (year === null || value === null) return data;
  // The live feed is a monthly mean; the layer series is annual. Mark this
  // partial-year point as estimated rather than relabelling it as an annual mean.
  return withSeries(data, 'global', pointAt(year, value, 'estimated'));
}

function seaIce(data: LayerData, envelope: FeedEnvelope): LayerData {
  const item = envelope.items?.[0];
  const year = numberField(item, 'year');
  const value = numberField(item, 'extent', 'value');
  if (year === null || value === null) return data;
  return withSeries(data, 'arctic', pointAt(year, value));
}

function precipitation(data: LayerData, envelope: FeedEnvelope): LayerData {
  const item = envelope.items?.[0];
  const rate = numberField(item, 'precipitationMm', 'precipitation');
  const t = fractionalYear(textField(item, 'time')) ?? fractionalYear(envelope.dataTime) ?? null;
  if (rate === null || t === null) return data;
  // Open-Meteo reports the last hour; the layer's unit is mm/day.
  return withSeries(data, 'egypt', pointAt(t, rate * 24, 'estimated'));
}

function airQuality(data: LayerData, envelope: FeedEnvelope): LayerData {
  const item = envelope.items?.[0];
  const pm25 = numberField(item, 'pm25', 'pm2_5', 'value');
  const t = fractionalYear(textField(item, 'time')) ?? fractionalYear(envelope.dataTime) ?? null;
  if (pm25 === null || t === null) return data;
  return withSeries(data, 'egypt', pointAt(t, pm25, 'estimated'));
}

function eventMarkers(envelope: FeedEnvelope): Marker[] {
  const markers: Marker[] = [];
  for (const item of (envelope.items ?? []).slice(0, 200)) {
    const id = textField(item, 'id');
    const title = textField(item, 'title');
    const lat = numberField(item, 'lat');
    const lon = numberField(item, 'lon');
    if (!id || !title || lat === null || lon === null) continue;
    const date = textField(item, 'date') ?? envelope.dataTime.slice(0, 10);
    markers.push({
      id,
      category: textField(item, 'category') ?? 'event',
      lat,
      lon,
      t: date,
      title,
    });
  }
  return markers;
}

function events(data: LayerData, envelope: FeedEnvelope): LayerData {
  const markers = eventMarkers(envelope);
  if (markers.length === 0) return data;
  const year = yearOf(envelope);
  const count = markers.length;
  const series = data.series.global;
  const next =
    year === null || !series
      ? data
      : withSeries({ ...data, markers }, 'global', pointAt(Math.trunc(year), count));
  return { ...next, markers };
}

const MERGE: Partial<Record<LayerId, (data: LayerData, envelope: FeedEnvelope) => LayerData>> = {
  temperature,
  co2,
  sea_ice: seaIce,
  precipitation,
  air_quality: airQuality,
  events,
};

/**
 * Attach the feed status to a layer and merge its newest point without
 * rewriting the recorded history. Unknown feeds only update the badge.
 */
export function mergeFeedEnvelope(layer: LoadedLayer, envelope: FeedEnvelope): LoadedLayer {
  const merge = MERGE[layer.config.id];
  const data = merge ? merge(layer.data, envelope) : layer.data;
  return { ...layer, data, feed: envelope, status: envelope.status };
}
