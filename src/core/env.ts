import * as z from 'zod';

const ServerEnvSchema = z.object({
  GROQ_API_KEY: z.string().default(''),
  GEMINI_API_KEY: z.string().default(''),
  OPENROUTER_API_KEY: z.string().default(''),
  AGENT_PROVIDER_ORDER: z.string().default('groq,gemini,openrouter'),
  GROQ_AGENT_MODEL: z.string().default('openai/gpt-oss-120b'),
  GEMINI_AGENT_MODEL: z.string().default('gemini-3-flash-preview'),
  OPENROUTER_AGENT_MODEL: z.string().default('deepseek/deepseek-v4-flash'),
  GROQ_STT_MODEL: z.string().default('whisper-large-v3-turbo'),
  FIRMS_MAP_KEY: z.string().default(''),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export function readServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  return ServerEnvSchema.parse({
    GROQ_API_KEY: source.GROQ_API_KEY ?? '',
    GEMINI_API_KEY: source.GEMINI_API_KEY ?? '',
    OPENROUTER_API_KEY: source.OPENROUTER_API_KEY ?? '',
    AGENT_PROVIDER_ORDER: source.AGENT_PROVIDER_ORDER || 'groq,gemini,openrouter',
    GROQ_AGENT_MODEL: source.GROQ_AGENT_MODEL || 'openai/gpt-oss-120b',
    GEMINI_AGENT_MODEL: source.GEMINI_AGENT_MODEL || 'gemini-3-flash-preview',
    OPENROUTER_AGENT_MODEL: source.OPENROUTER_AGENT_MODEL || 'deepseek/deepseek-v4-flash',
    GROQ_STT_MODEL: source.GROQ_STT_MODEL || 'whisper-large-v3-turbo',
    FIRMS_MAP_KEY: source.FIRMS_MAP_KEY ?? '',
  });
}
