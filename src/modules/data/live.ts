import { assetBase } from '@/core/assets';
import type { LayerId } from '@/core/actions';
import { envelope } from './envelope';
import { loadFeedChain, type FeedAttempt, type FeedLoader } from './fallback';
import { FeedEnvelopeSchema, type FeedEnvelope } from './schemas';

/** The feeds the API allowlists. Keep in sync with `src/server/feeds/run.ts`. */
export const LIVE_FEEDS = [
  'gistemp',
  'noaa-gml',
  'nsidc',
  'open-meteo',
  'open-meteo-aq',
  'eonet',
  'firms-24h',
  'firms-area',
  'openaq',
] as const;

export type LiveFeed = (typeof LIVE_FEEDS)[number];

export function isLiveFeed(value: string): value is LiveFeed {
  return (LIVE_FEEDS as readonly string[]).includes(value);
}

/**
 * Which live feed updates which layer. `gibs-grid` is an imagery feed, not a
 * series feed, so it stays out of this map.
 */
export const FEED_FOR_LAYER: Partial<Record<LayerId, LiveFeed>> = {
  temperature: 'gistemp',
  co2: 'noaa-gml',
  sea_ice: 'nsidc',
  precipitation: 'open-meteo',
  air_quality: 'open-meteo-aq',
  events: 'eonet',
  wildfire: 'firms-24h',
};

export function feedForLayer(id: LayerId): LiveFeed | null {
  return FEED_FOR_LAYER[id] ?? null;
}

/**
 * Resolve the feed a layer hydrates from. The registry descriptor wins, but
 * layers without one (precipitation, events) still use the static map.
 * `gibs-grid` is imagery and never a series feed, so it resolves to null.
 */
export function feedForEntry(id: LayerId, registryFeed?: string): string | null {
  const feed = registryFeed ?? feedForLayer(id);
  if (!feed || feed === 'gibs-grid') return null;
  return feed;
}

const CACHE_PREFIX = 'el.live.v1.';

function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

/** A previous response on this device. It is always presented as a snapshot. */
export function readCachedFeed(
  feed: string,
  store: Storage | null = storage(),
): FeedAttempt | null {
  if (!store) return null;
  try {
    const raw = store.getItem(`${CACHE_PREFIX}${feed}`);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { savedAt?: unknown; body?: unknown };
    const parsed = FeedEnvelopeSchema.safeParse(saved.body);
    if (!parsed.success) return null;
    return { ok: true, body: parsed.data };
  } catch {
    return null;
  }
}

export function writeCachedFeed(
  feed: string,
  body: FeedEnvelope,
  store: Storage | null = storage(),
): void {
  if (!store) return;
  try {
    store.setItem(
      `${CACHE_PREFIX}${feed}`,
      JSON.stringify({ savedAt: new Date().toISOString(), body }),
    );
  } catch {
    /* A full or blocked storage must never take the page down. */
  }
}

export function clearCachedFeed(feed: string, store: Storage | null = storage()): void {
  if (!store) return;
  try {
    store.removeItem(`${CACHE_PREFIX}${feed}`);
  } catch {
    /* ignore */
  }
}

export async function demoFeedEnvelope(feed: string): Promise<FeedEnvelope> {
  const now = new Date().toISOString();
  return envelope({
    feed,
    status: 'demo',
    dataTime: now,
    fetchedAt: now,
    source: { name: `${feed} (demo)`, url: 'https://earth.gov/', license: 'demo' },
    latencyNote: 'Live feed unavailable. Showing bundled data.',
    items: [],
  });
}

/** `fetch` that never rejects and never leaves a request hanging. */
export async function fetchJsonAttempt(url: string, timeoutMs = 5000): Promise<FeedAttempt> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    if (!response.ok)
      return { ok: false, status: response.status, note: `${url} ${response.status}` };
    return { ok: true, body: (await response.json()) as unknown };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      note: error instanceof Error ? error.message : `${url} unavailable`,
    };
  } finally {
    clearTimeout(timer);
  }
}

export const httpLoader: FeedLoader = { fetchJson: fetchJsonAttempt };

export interface LiveLoadOptions {
  demo?: boolean;
  assetBase?: string;
  loader?: FeedLoader;
  timeoutMs?: number;
}

/**
 * Live API → device cache → asset-host snapshot → bundled snapshot → demo.
 * The result always carries a truthful status, and repeated failures keep the
 * last good copy usable offline.
 */
export async function loadLiveEnvelope(
  feed: string,
  options: LiveLoadOptions = {},
): Promise<FeedEnvelope> {
  const demo = options.demo === true;
  const cached = readCachedFeed(feed);
  const loader =
    options.loader ??
    (options.timeoutMs === undefined
      ? httpLoader
      : { fetchJson: (url: string) => fetchJsonAttempt(url, options.timeoutMs) });

  const result = await loadFeedChain(feed, {
    demo,
    assetBase: options.assetBase ?? assetBase(),
    loader,
    demoEnvelope: await demoFeedEnvelope(feed),
    cached,
  });

  if (result.status !== 'demo') writeCachedFeed(feed, result);
  return result;
}
