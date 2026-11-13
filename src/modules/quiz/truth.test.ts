import { describe, expect, it } from 'vitest';
import { groundTruth } from './truth';

describe('groundTruth', () => {
  it('classifies the reference clips', () => {
    const rising = [0, 0.1, 0.2, 0.3].map((v, index) => ({ t: 2000 + index, v }));
    expect(groundTruth(rising, { min: 0, max: 2 })).toBe('increased');
    const flat = [0.5, 0.52, 0.49, 0.51].map((v, index) => ({ t: 2000 + index, v }));
    expect(groundTruth(flat, { min: 0, max: 2 })).toBe('unchanged');
    const ice = [1979, 1989, 1999, 2009, 2019].map((t, index) => ({
      t,
      v: [7, 6.5, 6, 5.2, 4.3][index] ?? null,
    }));
    expect(groundTruth(ice, { min: 3, max: 8 })).toBe('decreased');
  });
});
