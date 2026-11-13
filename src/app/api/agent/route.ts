import * as z from 'zod';
import { runAgent } from '@/modules/agent';
import type { AgentRequest } from '@/modules/agent';

const hits = new Map<string, number[]>();

const BodySchema = z.object({
  text: z.string().max(2000),
  lang: z.enum(['en', 'ar']),
  state: z.record(z.string(), z.unknown()).optional(),
  layerSummary: z
    .array(
      z.object({
        id: z.string(),
        range: z.object({ min: z.number(), max: z.number() }),
        unit: z.string(),
        currentValue: z.number().nullable(),
        first: z.union([z.number(), z.string()]).nullable(),
        last: z.union([z.number(), z.string()]).nullable(),
      }),
    )
    .optional(),
});

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((stamp) => now - stamp < 60_000);
  if (recent.length >= 10) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export async function POST(request: Request): Promise<Response> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (limited(ip)) {
    return Response.json(
      { actions: [], say: { en: 'Slow down a moment.', ar: 'استنى لحظة.' }, provider: 'none' },
      { status: 429 },
    );
  }
  const raw = await request.text();
  if (raw.length > 4096) return Response.json({ error: 'body too large' }, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return Response.json({ error: 'bad request' }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: 'bad request' }, { status: 400 });
  const agentRequest: AgentRequest = {
    text: parsed.data.text,
    lang: parsed.data.lang,
    state: parsed.data.state ?? {},
    layerSummary: parsed.data.layerSummary ?? [],
  };
  const result = await runAgent(agentRequest);
  return Response.json(result);
}
