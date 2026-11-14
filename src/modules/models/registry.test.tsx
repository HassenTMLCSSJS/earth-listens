import { describe, expect, it } from 'vitest';
import { MODELS, getModel } from './registry';

const R2 = 'https://pub-f4844155e9804bb5adcb0c121896e82b.r2.dev';

describe('models registry — GLB entries', () => {
  it('exposes the satellite GLB with the right id, file and empty clips', () => {
    const sat = getModel('satellite');
    expect(sat).toBeDefined();
    expect(sat?.id).toBe('satellite');
    expect(sat?.file).toBe(`${R2}/v1/models/satellite.glb`);
    expect(sat?.clips).toEqual([]);
    expect(sat?.placement).toBe('globe');
    expect(sat?.layer).toBe('events');
  });

  it('exposes inst_guitar GLB entry', () => {
    const guitar = getModel('inst_guitar');
    expect(guitar).toBeDefined();
    expect(guitar?.id).toBe('inst_guitar');
    expect(guitar?.file).toBe(`${R2}/v1/models/guitar.glb`);
    expect(guitar?.clips).toEqual([]);
    expect(guitar?.placement).toBe('overlay');
    expect(guitar?.layer).toBe('temperature');
    expect(guitar?.label.en).toBe('Guitar');
  });

  it('keeps the ModelProps shape unchanged', () => {
    // Compile-time contract: these keys must exist and accept these types.
    const props = { playing: true, intensity: 0.5, focused: false, reducedMotion: true };
    const sat = getModel('satellite');
    expect(() => sat?.StandIn(props)).not.toThrow();
    expect(MODELS.length).toBeGreaterThanOrEqual(19);
  });
});
