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
  OPENAQ_API_KEY: z.string().default(''),
  NASA_API_KEY: z.string().default(''),
  EARTHDATA_TOKEN: z.string().default(''),
  R2_ACCOUNT_ID: z.string().default(''),
  R2_ACCESS_KEY_ID: z.string().default(''),
  R2_SECRET_ACCESS_KEY: z.string().default(''),
  R2_BUCKET: z.string().default(''),
  CRON_SECRET: z.string().default(''),
  REVALIDATE_SECRET: z.string().default(''),
  NEXT_PUBLIC_ASSET_BASE_URL: z.string().default(''),
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
    OPENAQ_API_KEY: source.OPENAQ_API_KEY ?? '',
    NASA_API_KEY: source.NASA_API_KEY ?? '',
    EARTHDATA_TOKEN: source.EARTHDATA_TOKEN ?? '',
    R2_ACCOUNT_ID: source.R2_ACCOUNT_ID ?? '',
    R2_ACCESS_KEY_ID: source.R2_ACCESS_KEY_ID ?? '',
    R2_SECRET_ACCESS_KEY: source.R2_SECRET_ACCESS_KEY ?? '',
    R2_BUCKET: source.R2_BUCKET ?? '',
    CRON_SECRET: source.CRON_SECRET ?? '',
    REVALIDATE_SECRET: source.REVALIDATE_SECRET ?? '',
    NEXT_PUBLIC_ASSET_BASE_URL: source.NEXT_PUBLIC_ASSET_BASE_URL ?? '',
  });
}
