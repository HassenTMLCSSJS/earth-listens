import { readServerEnv } from '@/core/env';
import { FEED_IDS, liveFeed } from '@/server/feeds/run';

export async function GET(request: Request): Promise<Response> {
  const env = readServerEnv();
  const header = request.headers.get('authorization') ?? '';
  if (!env.CRON_SECRET || header !== `Bearer ${env.CRON_SECRET}`) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const results = [];
  for (const feed of FEED_IDS) {
    try {
      const body = await liveFeed(feed);
      results.push({ feed, status: body.status, snapshotId: body.snapshotId });
    } catch {
      results.push({ feed, status: 'demo', snapshotId: null });
    }
  }
  return Response.json({ ok: true, results });
}
