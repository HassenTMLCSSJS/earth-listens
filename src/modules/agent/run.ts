import { parseAction } from '@/core/actions';
import { readServerEnv } from '@/core/env';
import { promptBudget, SYSTEM_PROMPT, agentTools } from './prompt';
import type { AgentRequest, AgentResponse, LlmProvider } from './types';

const FALLBACK: AgentResponse = {
  actions: [],
  say: {
    en: "I didn't catch that, say help",
    ar: 'معلش، ماسمعتش كويس. جرّب تاني، أو قول "مساعدة".',
  },
  provider: 'none',
};

function providers(): LlmProvider[] {
  const env = readServerEnv();
  const order = env.AGENT_PROVIDER_ORDER.split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const catalog: Record<string, LlmProvider | null> = {
    mock: {
      id: 'mock',
      async complete() {
        return { actions: [], say: { en: 'mock', ar: 'تجربة' }, provider: 'mock' };
      },
    },
    groq: env.GROQ_API_KEY
      ? httpProvider(
          'groq',
          'https://api.groq.com/openai/v1',
          env.GROQ_AGENT_MODEL,
          env.GROQ_API_KEY,
        )
      : null,
    gemini: env.GEMINI_API_KEY
      ? httpProvider(
          'gemini',
          'https://generativelanguage.googleapis.com/v1beta/openai',
          env.GEMINI_AGENT_MODEL,
          env.GEMINI_API_KEY,
        )
      : null,
    openrouter: env.OPENROUTER_API_KEY
      ? httpProvider(
          'openrouter',
          'https://openrouter.ai/api/v1',
          env.OPENROUTER_AGENT_MODEL,
          env.OPENROUTER_API_KEY,
        )
      : null,
  };
  return order.flatMap((id) => {
    const provider = catalog[id];
    return provider ? [provider] : [];
  });
}

function httpProvider(id: string, base: string, model: string, key: string): LlmProvider {
  return {
    id,
    async complete(req, signal) {
      const response = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        signal,
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: JSON.stringify({
                text: req.text,
                lang: req.lang,
                state: req.state,
                layerSummary: req.layerSummary,
              }),
            },
          ],
          tools: agentTools(),
          tool_choice: 'auto',
        }),
      });
      if (!response.ok) throw new Error(`provider ${id} failed`);
      const body = (await response.json()) as {
        choices?: {
          message?: { tool_calls?: { function?: { name?: string; arguments?: string } }[] };
        }[];
      };
      const calls = body.choices?.[0]?.message?.tool_calls ?? [];
      const actions = calls
        .map((call) => {
          try {
            return parseAction({
              type: call.function?.name,
              ...JSON.parse(call.function?.arguments ?? '{}'),
            });
          } catch {
            return null;
          }
        })
        .filter((action): action is NonNullable<typeof action> => action !== null)
        .slice(0, 4);
      return { actions, provider: id };
    },
  };
}

export async function runAgent(req: AgentRequest): Promise<AgentResponse> {
  if (promptBudget() > 3600) return FALLBACK;
  for (const provider of providers()) {
    try {
      return await provider.complete(req, AbortSignal.timeout(4000));
    } catch {
      continue;
    }
  }
  return FALLBACK;
}

export function fallbackResponse(): AgentResponse {
  return FALLBACK;
}
