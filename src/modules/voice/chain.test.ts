import { describe, expect, it } from 'vitest';
import { promptBudget } from '@/modules/agent';
import { typedStt } from '@/modules/voice';

describe('voice and prompt contracts', () => {
  it('keeps the agent prompt under the token budget', () => {
    expect(promptBudget()).toBeLessThan(3600);
  });

  it('always offers the typed command fallback', async () => {
    await expect(typedStt.available()).resolves.toBe(true);
    expect(typedStt.id).toBe('typed');
  });
});
