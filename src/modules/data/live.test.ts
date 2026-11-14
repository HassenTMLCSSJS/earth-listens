import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LayerId } from '@/core/actions';
import { envelope } from './envelope';
import type { FeedAttempt } from './fallback';
import {
  clearCachedFeed,
  demoFeedEnvelope,
  feedForEntry,
  feedForLayer,
  fetchJsonAttempt,
  isLiveFeed,
  loadLiveEnvelope,
  readCachedFeed,
  writeCachedFeed,
} from './live';
import { fractionalYear, mergeFeedEnvelope, upsertPoint } from './live-merge';
import { LayerConfigSchema, LayerDataSchema, type LoadedLayer } from './schemas';

function loadLayer(id: LayerId, dataFile = `${id}.json`): LoadedLayer {
  const config = LayerConfigSchema.parse(
    JSON.parse(readFileSync(`public/data/layers/${id}.config.json`, 'utf8')),
  );
  const data = LayerDataSchema.parse(
    JSON.parse(readFileSync(`public/data/layers/${dataFile}`, 'utf8')),
  );
  return { config, data, isSample: data.sample };
}

async function feed(feedId: string, items: unknown[], dataTime = '2026-11-13T00:00:00Z') {
  return envelope({
    feed: feedId,
    status: 'live',
    dataTime,
    fetchedAt: '2026-11-13T12:00:00Z',
    source: { name: feedId, url: 'https://earth.gov/', license: 'test' },
    latencyNote: 'test',
    items,
  });
}

function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('live feed helpers', () => {
  it('maps layers to allowlisted feeds', () => {
    expect(isLiveFeed('gistemp')).toBe(true);
    expect(isLiveFeed('giss')).toBe(false);
    expect(feedForLayer('temperature')).toBe('gistemp');
    expect(feedForLayer('forest')).toBeNull();
  });

  it('falls back to the static map when the registry has no feed', () => {
    expect(feedForEntry('temperature', 'gistemp')).toBe('gistemp');
    expect(feedForEntry('precipitation', undefined)).toBe('open-meteo');
    expect(feedForEntry('events', undefined)).toBe('eonet');
    expect(feedForEntry('night_lights', 'gibs-grid')).toBeNull();
    expect(feedForEntry('forest', undefined)).toBeNull();
  });

  it('walks live → device cache → snapshot', async () => {
    const store = fakeStorage();
    vi.stubGlobal('localStorage', store);
    const live = await feed('gistemp', [{ year: 2025, value: 1.19 }]);
    const liveLoader = {
      fetchJson: vi.fn(async (url: string): Promise<FeedAttempt> =>
        url.startsWith('/api/live/')
          ? { ok: true, body: live }
          : { ok: false, status: 404, note: 'missing' },
      ),
    };
    const first = await loadLiveEnvelope('gistemp', { loader: liveLoader, assetBase: '' });
    expect(first.status).toBe('live');
    expect(readCachedFeed('gistemp', store)?.ok).toBe(true);

    const downLoader = {
      fetchJson: vi.fn(async (): Promise<FeedAttempt> => ({
        ok: false,
        status: 500,
        note: 'down',
      })),
    };
    const second = await loadLiveEnvelope('gistemp', { loader: downLoader, assetBase: '' });
    expect(second.status).toBe('snapshot');
    expect(second.feed).toBe('gistemp');

    clearCachedFeed('gistemp', store);
    expect(readCachedFeed('gistemp', store)).toBeNull();
    const third = await loadLiveEnvelope('gistemp', { loader: downLoader, assetBase: '' });
    expect(third.status).toBe('demo');
  });

  it('never touches the network in demo mode', async () => {
    const loader = {
      fetchJson: vi.fn(async (): Promise<FeedAttempt> => ({ ok: false, status: 0, note: 'no' })),
    };
    const result = await loadLiveEnvelope('eonet', { demo: true, loader, assetBase: '' });
    expect(result.status).toBe('demo');
    expect(loader.fetchJson).not.toHaveBeenCalled();
    expect((await demoFeedEnvelope('eonet')).status).toBe('demo');
  });

  it('reports a failed fetch instead of throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503 })),
    );
    expect(await fetchJsonAttempt('/api/live/gistemp', 20)).toMatchObject({
      ok: false,
      status: 503,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    expect(await fetchJsonAttempt('/api/live/gistemp', 20)).toMatchObject({ ok: false, status: 0 });
  });
});

describe('live merge', () => {
  it('appends a new year and replaces the same year', async () => {
    const layer = loadLayer('temperature');
    const appended = mergeFeedEnvelope(layer, await feed('gistemp', [{ year: 2026, value: 1.5 }]));
    expect(appended.data.series.global?.at(-1)).toMatchObject({ t: 2026, v: 1.5 });
    expect(appended.data.range.max).toBe(2026);
    expect(appended.status).toBe('live');

    const replaced = mergeFeedEnvelope(layer, await feed('gistemp', [{ year: 2025, value: 1.3 }]));
    expect(replaced.data.series.global).toHaveLength(layer.data.series.global?.length ?? 0);
    expect(replaced.data.series.global?.at(-1)).toMatchObject({ t: 2025, v: 1.3 });
  });

  it('marks the partial CO2 year as estimated', async () => {
    const merged = mergeFeedEnvelope(
      loadLayer('co2'),
      await feed('noaa-gml', [{ year: 2026, month: 9, ppm: 430 }]),
    );
    expect(merged.data.series.global?.at(-1)).toMatchObject({ t: 2026, v: 430, q: 'estimated' });
  });

  it('merges sea ice, rainfall and Cairo air quality in the right regions', async () => {
    const ice = mergeFeedEnvelope(
      loadLayer('sea_ice'),
      await feed('nsidc', [{ year: 2027, extent: 4.5 }]),
    );
    expect(ice.data.series.arctic?.at(-1)).toMatchObject({ t: 2027, v: 4.5 });

    const rain = mergeFeedEnvelope(
      loadLayer('precipitation'),
      await feed(
        'open-meteo',
        [{ time: '2026-11-13T11:00', precipitationMm: 0.5 }],
        '2026-11-13T11:00:00Z',
      ),
    );
    expect(rain.data.series.egypt?.at(-1)?.v).toBeCloseTo(12);
    expect(rain.data.series.global).toEqual(loadLayer('precipitation').data.series.global);

    const air = mergeFeedEnvelope(
      loadLayer('air_quality'),
      await feed('open-meteo-aq', [{ time: '2026-11-13T11:00', pm25: 22 }], '2026-11-13T11:00:00Z'),
    );
    expect(air.data.series.egypt?.at(-1)?.v).toBe(22);
  });

  it('turns EONET items into globe markers and a fresh count', async () => {
    const merged = mergeFeedEnvelope(
      loadLayer('events'),
      await feed(
        'eonet',
        [
          {
            id: 'a',
            title: 'Storm',
            category: 'Severe Storms',
            lat: 10,
            lon: 20,
            date: '2026-11-12',
          },
          { id: 'b', title: 'Fire', category: 'Wildfires', lat: -5, lon: 30 },
        ],
        '2026-11-13T00:00:00Z',
      ),
    );
    expect(merged.data.markers).toHaveLength(2);
    expect(merged.data.markers?.[1]?.t).toBe('2026-11-13');
    expect(merged.data.series.global?.at(-1)).toMatchObject({ t: 2026, v: 2 });
  });

  it('keeps sample history intact for an imagery-only merge', async () => {
    const layer = loadLayer('wildfire', 'wildfire.sample.json');
    const merged = mergeFeedEnvelope(layer, await feed('firms-24h', [{ lat: 1, lon: 2 }]));
    expect(merged.data).toBe(layer.data);
    expect(merged.isSample).toBe(true);
    expect(merged.status).toBe('live');
  });

  it('never rewrites an older history point', () => {
    const points = [
      { t: 2024, v: 1, q: 'ok' as const },
      { t: 2025, v: 2, q: 'ok' as const },
    ];
    expect(upsertPoint(points, { t: 2020, v: 9, q: 'ok' })).toEqual(points);
    expect(fractionalYear('2026-07-02')).toBeCloseTo(2026.5, 2);
    expect(fractionalYear('not-a-date')).toBeNull();
  });
});
