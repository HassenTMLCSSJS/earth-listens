import { cacheControl } from '@/modules/data';
import { liveFeed } from '@/server/feeds/run';

export async function GET(
  _request: Request,
  context: { params: Promise<{ feed: string }> },
): Promise<Response> {
  const { feed } = await context.params;
  const body = await liveFeed(feed);
  return Response.json(body, {
    headers: { 'Cache-Control': cacheControl(feed) },
  });
}
