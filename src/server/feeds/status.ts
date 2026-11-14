import type { FreshnessStatus } from '@/modules/data';
import { FEED_IDS, liveFeed, type FeedId } from './run';

export interface FeedStatus {
  id: FeedId;
  status: FreshnessStatus;
  dataTime: string;
  fetchedAt: string;
  source: string;
}

const CACHE_MS = 300_000;
let cache: { at: number; body: FeedStatus[] } | null = null;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('feed status timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

/** One healthy/missing row per allowlisted feed. Cached for five minutes. */
export async function feedStatuses(now = Date.now()): Promise<FeedStatus[]> {
  if (cache && now - cache.at < CACHE_MS) return cache.body;
  const at = new Date(now).toISOString();
  const body = await Promise.all(
    FEED_IDS.map(async (id): Promise<FeedStatus> => {
      try {
        const envelope = await withTimeout(liveFeed(id), 3000);
        return {
          id,
          status: envelope.status,
          dataTime: envelope.dataTime,
          fetchedAt: envelope.fetchedAt,
          source: envelope.source.name,
        };
      } catch {
        return { id, status: 'demo', dataTime: at, fetchedAt: at, source: id };
      }
    }),
  );
  cache = { at: now, body };
  return body;
}

export function resetFeedStatusCache(): void {
  cache = null;
}
