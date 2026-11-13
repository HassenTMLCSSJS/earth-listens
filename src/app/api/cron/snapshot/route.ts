import { readServerEnv } from '@/core/env';
import { liveFeed } from '@/server/feeds/run';

const FEEDS = ['gistemp', 'noaa-gml', 'nsidc', 'open-meteo', 'open-meteo-aq', 'eonet', 'firms-24h'];

export async function GET(request: Request): Promise<Response> {
  const env = readServerEnv();
  const header = request.headers.get('authorization') ?? '';
  if (!env.CRON_SECRET || header !== `Bearer ${env.CRON_SECRET}`) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const results = [];
  for (const feed of FEEDS) {
    const body = await liveFeed(feed);
    results.push({ feed, status: body.status, snapshotId: body.snapshotId });
  }
  return Response.json({ ok: true, results });
}
