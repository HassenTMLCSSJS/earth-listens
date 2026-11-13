import { describe, expect, it } from 'vitest';
import { readServerEnv } from './env';

describe('readServerEnv', () => {
  it('fills every server key with a safe default', () => {
    const env = readServerEnv({ NODE_ENV: 'test' });
    expect(env.GROQ_API_KEY).toBe('');
    expect(env.GEMINI_API_KEY).toBe('');
    expect(env.OPENROUTER_API_KEY).toBe('');
    expect(env.FIRMS_MAP_KEY).toBe('');
    expect(env.OPENAQ_API_KEY).toBe('');
    expect(env.NASA_API_KEY).toBe('');
    expect(env.EARTHDATA_TOKEN).toBe('');
    expect(env.R2_ACCOUNT_ID).toBe('');
    expect(env.R2_ACCESS_KEY_ID).toBe('');
    expect(env.R2_SECRET_ACCESS_KEY).toBe('');
    expect(env.R2_BUCKET).toBe('');
    expect(env.CRON_SECRET).toBe('');
    expect(env.NEXT_PUBLIC_ASSET_BASE_URL).toBe('');
  });

  it('keeps the existing provider and model defaults', () => {
    const env = readServerEnv({ NODE_ENV: 'test' });
    expect(env.AGENT_PROVIDER_ORDER).toBe('groq,gemini,openrouter');
    expect(env.GROQ_AGENT_MODEL).toBe('openai/gpt-oss-120b');
    expect(env.GEMINI_AGENT_MODEL).toBe('gemini-3-flash-preview');
    expect(env.OPENROUTER_AGENT_MODEL).toBe('deepseek/deepseek-v4-flash');
    expect(env.GROQ_STT_MODEL).toBe('whisper-large-v3-turbo');
  });

  it('reads provided values and falls back when a string is empty', () => {
    const env = readServerEnv({
      NODE_ENV: 'test',
      GROQ_API_KEY: 'server-key',
      CRON_SECRET: 'cron-key',
      AGENT_PROVIDER_ORDER: '',
      NEXT_PUBLIC_ASSET_BASE_URL: 'off',
    });
    expect(env.GROQ_API_KEY).toBe('server-key');
    expect(env.CRON_SECRET).toBe('cron-key');
    expect(env.AGENT_PROVIDER_ORDER).toBe('groq,gemini,openrouter');
    expect(env.NEXT_PUBLIC_ASSET_BASE_URL).toBe('off');
  });

  it('does not expose the removed REVALIDATE_SECRET key', () => {
    const env = readServerEnv({ NODE_ENV: 'test', REVALIDATE_SECRET: 'old-value' });
    expect(Object.keys(env)).not.toContain('REVALIDATE_SECRET');
    expect('REVALIDATE_SECRET' in env).toBe(false);
  });
});
