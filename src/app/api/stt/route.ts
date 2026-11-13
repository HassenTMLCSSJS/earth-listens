import { readServerEnv } from '@/core/env';

export async function POST(request: Request): Promise<Response> {
  const env = readServerEnv();
  if (!env.GROQ_API_KEY) return Response.json({ error: 'stt unavailable' }, { status: 503 });
  const form = await request.formData();
  const file = form.get('file');
  const lang = form.get('lang') === 'ar' ? 'ar' : 'en';
  if (!(file instanceof File) || file.size > 1_000_000)
    return Response.json({ error: 'bad audio' }, { status: 400 });
  const body = new FormData();
  body.set('file', file, file.name || 'speech.webm');
  body.set('model', env.GROQ_STT_MODEL);
  body.set('language', lang);
  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.GROQ_API_KEY}` },
    body,
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) return Response.json({ error: 'stt failed' }, { status: 502 });
  const json = (await response.json()) as { text?: string };
  return Response.json({ text: json.text ?? '' });
}
