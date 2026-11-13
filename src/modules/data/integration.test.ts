import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  binFires,
  parseEonet,
  parseFirmsCsv,
  parseGistemp,
  parseNoaaCo2,
  parseNsidcMonthly,
  parseOpenAq,
  parseOpenMeteo,
  parseOpenMeteoAq,
} from './adapters/parse';
import { createLru } from './cache/memory';
import { cacheControl } from './cache/policy';
import { idbGet } from './cache/idb';
import { decodeRgba, lightningSeasons, parseColormapXml } from './colormap';
import { chooseTier, gridRegionStats } from './decode';
import { clientUrlAllowed, envelope, redactSecrets, snapshotIdOf } from './envelope';
import { chooseFeed, loadFeedChain } from './fallback';
import { describeFreshness, statusForAge } from './freshness';
import { LayerConfigSchema, LayerDataSchema, RegistrySchema } from './schemas';
import type { FeedEnvelope } from './schemas';
import { buildScore, type ScoreInput } from '@/modules/sonification';

const recorded = 'pipeline/tests/fixtures/recorded';

async function demoEnvelope(feed: string): Promise<FeedEnvelope> {
  return envelope({
    feed,
    status: 'demo',
    dataTime: '2026-11-13T00:00:00Z',
    fetchedAt: '2026-11-13T00:00:00Z',
    source: { name: 'demo', url: 'https://earth.gov/', license: 'demo' },
    latencyNote: 'Demo data',
    items: [],
  });
}

describe('recorded adapters', () => {
  it('parses the GISTEMP file and leaves 2026 empty', () => {
    const rows = parseGistemp(readFileSync(`${recorded}/gistemp-2026-11-13.csv`, 'utf8'));
    expect(rows.find((row) => row.year === 1880)?.value).toBeCloseTo(-0.18);
    expect(rows.find((row) => row.year === 2025)?.value).toBeCloseTo(1.19);
    expect(rows.find((row) => row.year === 2026)?.value).toBeNull();
  });

  it('parses Mauna Loa monthly CO2', () => {
    const rows = parseNoaaCo2(readFileSync(`${recorded}/co2_mm_mlo-2026-11-13.csv`, 'utf8'));
    expect(rows[0]).toMatchObject({ year: 1958, month: 3, average: 315.71 });
    expect(rows.at(-1)).toMatchObject({ year: 2026, month: 9, average: 426.07 });
  });

  it('parses the NSIDC September series', () => {
    const rows = parseNsidcMonthly(readFileSync(`${recorded}/nsidc-sept-2026-11-13.csv`, 'utf8'));
    expect(rows[0]).toMatchObject({ year: 1979, extent: 7.05 });
    expect(rows.at(-1)).toMatchObject({ year: 2026, extent: 4.81 });
  });

  it('keeps VIIRS nominal detections and bins them', () => {
    const points = parseFirmsCsv(
      readFileSync(`${recorded}/firms-viirs-n20-2026-11-13.csv`, 'utf8'),
    );
    expect(points[0]?.lat).toBeCloseTo(-18.85008);
    expect(points[0]?.confidence).toBe('nominal');
    expect(
      points.every((point) => point.confidence === 'nominal' || point.confidence === 'high'),
    ).toBe(true);
    const binned = binFires(points, 5);
    expect(binned.top).toHaveLength(5);
    expect(binned.cells.length).toBeGreaterThan(0);
  });

  it('parses Open-Meteo, air quality, EONET and OpenAQ', () => {
    const weather = parseOpenMeteo(
      JSON.parse(readFileSync(`${recorded}/open-meteo-cairo-2026-11-13.json`, 'utf8')),
    );
    expect(weather?.temperatureC).toBe(26.8);
    const air = parseOpenMeteoAq(
      JSON.parse(readFileSync(`${recorded}/open-meteo-aq-cairo-2026-11-13.json`, 'utf8')),
    );
    expect(air?.pm25).toBe(11.5);
    const events = parseEonet(
      JSON.parse(readFileSync(`${recorded}/eonet-2026-11-13.json`, 'utf8')),
    );
    expect(events.some((event) => event.id === 'EONET_26331')).toBe(true);
    expect(parseOpenMeteo(null)).toBeNull();
    expect(parseOpenMeteoAq({})).toBeNull();
    expect(parseEonet({})).toEqual([]);
    expect(
      parseOpenAq({
        results: [
          {
            parameter: { name: 'pm25', units: 'µg/m³' },
            value: 12,
            datetime: { utc: '2026-11-13T00:00:00Z' },
          },
        ],
      }),
    ).toEqual([{ parameter: 'pm25', value: 12, unit: 'µg/m³', date: '2026-11-13T00:00:00Z' }]);
  });

  it('decodes the real MUR SST PNG at a 100% colormap hit rate', async () => {
    const cmap = parseColormapXml(
      readFileSync(`${recorded}/GHRSST_Sea_Surface_Temperature.xml`, 'utf8'),
    );
    expect(cmap.units).toContain('C');
    const raw = await sharp(readFileSync(`${recorded}/sst-2024-08-15.png`))
      .ensureAlpha()
      .raw()
      .toBuffer({
        resolveWithObject: true,
      });
    const pixels = [];
    for (let index = 0; index < raw.data.length; index += 4) {
      pixels.push({
        r: raw.data[index] ?? 0,
        g: raw.data[index + 1] ?? 0,
        b: raw.data[index + 2] ?? 0,
        a: raw.data[index + 3] ?? 0,
      });
    }
    const decoded = decodeRgba(pixels, cmap);
    expect(decoded.hitRate).toBe(1);
    expect(decoded.opaque).toBe(76301);
    const night = LayerDataSchema.parse(
      JSON.parse(readFileSync('public/data/layers/night_lights.json', 'utf8')),
    );
    expect(night.sample).toBe(false);
    expect(night.unit.en).toContain('not calibrated radiance');
    expect(night.series.egypt?.[0]?.v).toBeCloseTo(38.6884);
    expect(night.series.egypt?.[1]?.v).toBeCloseTo(38.5287);
  });
});

describe('fallback, freshness and budgets', () => {
  it('walks live, snapshot, then demo', async () => {
    const demo = await demoEnvelope('gistemp');
    const live = await envelope({ ...demo, status: 'live', latencyNote: 'upstream' });
    expect(
      chooseFeed({ demo: true, live: null, remote: null, bundled: null, demoEnvelope: demo })
        .status,
    ).toBe('demo');
    expect(
      chooseFeed({
        demo: false,
        live: { ok: true, body: live },
        remote: null,
        bundled: null,
        demoEnvelope: demo,
      }).status,
    ).toBe('live');
    const cached = await envelope({ ...demo, status: 'snapshot', latencyNote: 'saved' });
    expect(
      chooseFeed({
        demo: false,
        live: { ok: false, status: 500, note: 'down' },
        remote: { ok: true, body: cached },
        bundled: null,
        demoEnvelope: demo,
      }).status,
    ).toBe('snapshot');
    expect(
      chooseFeed({
        demo: false,
        live: { ok: false, status: 401, note: 'unauthorized' },
        remote: { ok: false, status: 404, note: 'missing' },
        bundled: { ok: false, status: 404, note: 'missing' },
        demoEnvelope: demo,
      }).status,
    ).toBe('demo');
    const loaded = await loadFeedChain('gistemp', {
      demo: false,
      assetBase: '',
      demoEnvelope: demo,
      loader: {
        async fetchJson(url: string) {
          if (url.startsWith('/api/live/')) return { ok: false, status: 500, note: 'down' };
          if (url.includes('/data/snapshots/')) return { ok: true, body: cached };
          return { ok: false, status: 404, note: 'no' };
        },
      },
    });
    expect(loaded.status).toBe('snapshot');
    expect(redactSecrets('key super-secret-value failed', ['super-secret-value'])).not.toContain(
      'super-secret',
    );
    expect(clientUrlAllowed('https://gibs.earthdata.nasa.gov/wms.cgi')).toBe(true);
    expect(clientUrlAllowed('https://example.com/file.nc')).toBe(false);
    expect(clientUrlAllowed('https://example.com/file.tif')).toBe(false);
  });

  it('labels freshness in Cairo time and keeps the same snapshot id', async () => {
    const body = await envelope({
      feed: 'gistemp',
      status: 'live',
      dataTime: '2025-07-01T00:00:00Z',
      fetchedAt: '2026-11-13T09:20:00Z',
      source: { name: 'GISTEMP', url: 'https://data.giss.nasa.gov/gistemp/', license: 'NASA' },
      latencyNote: 'annual',
      items: [{ year: 2025, value: 1.19 }],
    });
    expect(describeFreshness(body, 'en')).toContain('Cairo time');
    expect(describeFreshness({ ...body, status: 'snapshot' }, 'en')).toContain('Cached snapshot');
    expect(describeFreshness({ ...body, status: 'recent' }, 'ar')).toContain('48');
    expect(describeFreshness({ ...body, status: 'demo' }, 'en')).toBe('Demo data');
    expect(await snapshotIdOf({ b: 1, a: 2 })).toBe(await snapshotIdOf({ a: 2, b: 1 }));
    expect(statusForAge(1000, 5000)).toBe('live');
    expect(statusForAge(10 * 60 * 60 * 1000, 1000)).toBe('recent');
    expect(statusForAge(50 * 60 * 60 * 1000, 1000)).toBe('snapshot');
    expect(cacheControl('firms-24h')).toContain('s-maxage=1800');
  });

  it('bounds the texture tier and the region stats', () => {
    expect(lightningSeasons()).toHaveLength(18);
    expect(lightningSeasons()[0]?.id).toBe('2017-MAM');
    expect(lightningSeasons().at(-1)?.id).toBe('2021-JJA');
    expect(lightningSeasons()[0]?.days).toHaveLength(10);
    expect(
      chooseTier({
        quality: 'auto',
        mobile: true,
        coarsePointer: true,
        maxTextureSize: 4096,
        ktx2: false,
        smooth4k: false,
      }).texture,
    ).toBe(2048);
    expect(
      chooseTier({
        quality: 'auto',
        mobile: false,
        coarsePointer: false,
        maxTextureSize: 8192,
        deviceMemory: 8,
        ktx2: true,
        smooth4k: true,
      }).texture,
    ).toBe(8192);
    expect(
      chooseTier({
        quality: '4k',
        mobile: false,
        coarsePointer: false,
        maxTextureSize: 8192,
        ktx2: true,
        smooth4k: false,
      }).tier,
    ).toBe(2);
    const cache = createLru<string>(4);
    cache.set('a', 'one', 3);
    cache.set('b', 'two', 3);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe('two');
    const values = [1, Number.NaN, 3, 5];
    const stats = gridRegionStats(values, 2, 2, [-180, -90, 180, 90]);
    expect(stats.nValid).toBe(3);
    expect(stats.mean).not.toBeNull();
    expect(stats.p5).not.toBeNull();
  });

  it('skips IndexedDB when the platform has none', async () => {
    expect(await idbGet('missing')).toBeNull();
  });
});

describe('recorded histories', () => {
  it('points temperature, CO2 and sea ice at real files', () => {
    const registry = RegistrySchema.parse(
      JSON.parse(readFileSync('public/data/registry.json', 'utf8')),
    );
    for (const id of ['temperature', 'co2', 'sea_ice'] as const) {
      const entry = registry.layers.find((layer) => layer.id === id);
      expect(entry?.data).toBe(`/data/layers/${id}.json`);
      const data = LayerDataSchema.parse(
        JSON.parse(readFileSync(`public${entry?.data ?? ''}`, 'utf8')),
      );
      expect(data.sample).toBe(false);
      const sources = Array.isArray(data.source) ? data.source : [data.source];
      for (const source of sources) {
        expect(source.retrieved).toBe('2026-11-13');
        expect(source.sha256).toHaveLength(64);
      }
    }
    const temperature = LayerDataSchema.parse(
      JSON.parse(readFileSync('public/data/layers/temperature.json', 'utf8')),
    );
    expect(temperature.series.global?.[0]?.v).toBeCloseTo(-0.18);
    expect(temperature.series.global?.at(-1)?.v).toBeCloseTo(1.19);
    expect(temperature.series.egypt).toBeUndefined();
    const ice = LayerDataSchema.parse(
      JSON.parse(readFileSync('public/data/layers/sea_ice.json', 'utf8')),
    );
    expect(ice.series.arctic?.[0]?.v).toBeCloseTo(7.05);
    expect(ice.series.arctic?.at(-1)?.v).toBeCloseTo(4.81);
    expect(ice.series.global).toBeUndefined();
  });

  it('sounds a missing earcon and no note for a region with no series', () => {
    const config = LayerConfigSchema.parse(
      JSON.parse(readFileSync('public/data/layers/temperature.config.json', 'utf8')),
    );
    const data = LayerDataSchema.parse(
      JSON.parse(readFileSync('public/data/layers/temperature.json', 'utf8')),
    );
    const variable = (value: typeof config.variables.how_much) => ({
      field: value.field,
      range: value.range,
      ...(value.normalize
        ? {
            normalize: value.normalize.p
              ? { method: value.normalize.method, p: value.normalize.p }
              : { method: value.normalize.method },
          }
        : {}),
    });
    const input: ScoreInput = {
      mode: 'sweep',
      speed: 'normal',
      scale: 'pentatonic_major',
      tuning: 'microtonal',
      view: { lat: 0, lon: 0 },
      region: 'egypt',
      regions: { global: { lat: 0, lon: 0 }, egypt: { lat: 26.8, lon: 30.8 } },
      time: { from: 1880, to: 2025, cursor: 1880 },
      layers: [
        {
          config: {
            id: config.id,
            timeKind: config.timeKind,
            variables: {
              how_much: variable(config.variables.how_much),
              how_strong: variable(config.variables.how_strong),
              how_fast: variable(config.variables.how_fast),
              where: config.variables.where,
            },
            what: config.what,
            symphony: config.symphony,
          },
          data: { series: data.series },
        },
      ],
    };
    expect(buildScore(input).events).toHaveLength(0);
    expect(buildScore(input).earcons).toEqual([{ t: 0, id: 'missing' }]);
    expect(buildScore({ ...input, region: 'global' }).events.length).toBeGreaterThan(100);
  });
});
