import type { FeedEnvelope } from './schemas';

export type FeedAttempt = { ok: true; body: unknown } | { ok: false; status: number; note: string };

export interface FallbackInput {
  demo: boolean;
  live: FeedAttempt | null;
  /** A previous successful response kept on the device. Always relabelled snapshot. */
  cached?: FeedAttempt | null;
  remote: FeedAttempt | null;
  bundled: FeedAttempt | null;
  demoEnvelope: FeedEnvelope;
}

function asEnvelope(body: unknown, downgrade: boolean): FeedEnvelope | null {
  if (!body || typeof body !== 'object') return null;
  const row = body as FeedEnvelope;
  if (typeof row.feed !== 'string' || typeof row.snapshotId !== 'string') return null;
  if (downgrade && (row.status === 'live' || row.status === 'recent')) {
    return { ...row, status: 'snapshot' };
  }
  return row;
}

/**
 * live response → asset-host snapshot → bundled snapshot → demo.
 * A live body that already says snapshot/demo is kept. Cached data is never relabelled live.
 */
export function chooseFeed(input: FallbackInput): FeedEnvelope {
  if (input.demo) return { ...input.demoEnvelope, status: 'demo' };
  if (input.live?.ok) {
    const parsed = asEnvelope(input.live.body, false);
    if (parsed) return parsed;
  }
  if (input.cached?.ok) {
    const parsed = asEnvelope(input.cached.body, true);
    if (parsed) return parsed;
  }
  if (input.remote?.ok) {
    const parsed = asEnvelope(input.remote.body, true);
    if (parsed) return parsed;
  }
  if (input.bundled?.ok) {
    const parsed = asEnvelope(input.bundled.body, true);
    if (parsed) return parsed;
  }
  const note = [input.live && !input.live.ok ? input.live.note : '', input.demoEnvelope.latencyNote]
    .filter((part) => part.length > 0)
    .join(' ');
  return {
    ...input.demoEnvelope,
    status: 'demo',
    latencyNote: note || input.demoEnvelope.latencyNote,
  };
}

export interface FeedLoader {
  fetchJson(url: string): Promise<FeedAttempt>;
}

export async function loadFeedChain(
  feed: string,
  options: {
    demo: boolean;
    assetBase: string;
    loader: FeedLoader;
    demoEnvelope: FeedEnvelope;
    /** Older device-cached response, used before a stale bundled snapshot. */
    cached?: FeedAttempt | null;
  },
): Promise<FeedEnvelope> {
  if (options.demo)
    return chooseFeed({
      demo: true,
      live: null,
      cached: null,
      remote: null,
      bundled: null,
      demoEnvelope: options.demoEnvelope,
    });
  const live = await options.loader.fetchJson(`/api/live/${feed}`).catch((error: unknown) => ({
    ok: false as const,
    status: 0,
    note: error instanceof Error ? error.message : 'live failed',
  }));
  const remote = options.assetBase
    ? await options.loader
        .fetchJson(`${options.assetBase}/data/snapshots/${feed}/latest.json`)
        .catch(() => ({ ok: false as const, status: 0, note: 'remote snapshot failed' }))
    : { ok: false as const, status: 0, note: 'no asset host' };
  const bundled = await options.loader
    .fetchJson(`/data/snapshots/${feed}/latest.json`)
    .catch(() => ({
      ok: false as const,
      status: 0,
      note: 'no bundled snapshot',
    }));
  return chooseFeed({
    demo: false,
    live,
    cached: options.cached ?? null,
    remote,
    bundled,
    demoEnvelope: options.demoEnvelope,
  });
}
