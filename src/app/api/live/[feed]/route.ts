import { cacheControl } from '@/modules/data';
import { isFeedId, liveFeed, snapshotOrDemo } from '@/server/feeds/run';

export async function GET(
  _request: Request,
  context: { params: Promise<{ feed: string }> },
): Promise<Response> {
  const { feed } = await context.params;
  if (!isFeedId(feed)) {
    return Response.json({ error: 'unknown feed', feed }, { status: 404 });
  }
  try {
    const body = await liveFeed(feed);
    return Response.json(body, {
      headers: { 'Cache-Control': cacheControl(feed) },
    });
  } catch {
    const body = await snapshotOrDemo(feed, 'Live feed unavailable.');
    return Response.json(body, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
