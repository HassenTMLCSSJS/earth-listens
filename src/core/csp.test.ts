import { describe, expect, it } from 'vitest';
import { DEFAULT_ASSET_BASE } from '@/core/assets';
import { contentSecurityPolicy } from '@/core/csp';

function directive(policy: string, name: string): string[] {
  const part = policy
    .split(';')
    .map((item) => item.trim())
    .find((item) => item === name || item.startsWith(`${name} `));
  return part ? part.split(/\s+/).slice(1) : [];
}

describe('content security policy', () => {
  it('lets KTX2 transcode and load R2 textures without unsafe-eval', () => {
    const policy = contentSecurityPolicy(true);
    const script = directive(policy, 'script-src');
    expect(script).toContain("'wasm-unsafe-eval'");
    expect(script).not.toContain("'unsafe-eval'");
    expect(directive(policy, 'worker-src')).toEqual(expect.arrayContaining(["'self'", 'blob:']));
    expect(directive(policy, 'img-src')).toContain(DEFAULT_ASSET_BASE);
    expect(directive(policy, 'connect-src')).toContain(DEFAULT_ASSET_BASE);
    expect(policy).not.toMatch(/(^|[^\w-])'unsafe-eval'/);
  });

  it('keeps demo mode on same-origin resources', () => {
    const policy = contentSecurityPolicy(false);
    expect(policy).not.toContain(DEFAULT_ASSET_BASE);
    expect(policy).not.toContain('huggingface.co');
    expect(directive(policy, 'script-src')).not.toContain("'unsafe-eval'");
    expect(directive(policy, 'script-src')).toContain("'wasm-unsafe-eval'");
  });
});
