import { readServerEnv } from '@/core/env';
import { feedStatuses } from '@/server/feeds/status';

export async function GET(): Promise<Response> {
  const env = readServerEnv();
  const feeds = await feedStatuses();
  return Response.json(
    {
      ok: true,
      version: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
      time: new Date().toISOString(),
      agent: {
        providers: env.AGENT_PROVIDER_ORDER.split(',').map((provider) => provider.trim()),
        configured: {
          groq: env.GROQ_API_KEY.length > 0,
          gemini: env.GEMINI_API_KEY.length > 0,
          openrouter: env.OPENROUTER_API_KEY.length > 0,
        },
      },
      stt: { configured: env.GROQ_API_KEY.length > 0 },
      feeds,
    },
    {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    },
  );
}
