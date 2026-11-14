import { describe, expect, it } from 'vitest';
import { isVoice, rms } from './vad';

describe('voice activity', () => {
  it('measures silence and a spoken buffer', () => {
    expect(rms([])).toBe(0);
    expect(isVoice([0, 0, 0])).toBe(false);
    expect(isVoice([0.2, -0.2, 0.2])).toBe(true);
  });
});
