import { describe, expect, it } from 'vitest';
import { parseAction } from '@/core/actions';
import { DEFAULT_SETTINGS, initialAppData, reduceApp } from '@/core/store';

describe('settings action schema', () => {
  const accepted = [
    ['masterVolumeDb', -12],
    ['speechRate', 1],
    ['highContrast', true],
    ['reducedMotion', 'off'],
    ['screenReaderMode', false],
    ['captions', false],
    ['captionSize', 'lg'],
    ['earcons', false],
    ['haptics', false],
    ['spaceToTalk', true],
    ['textureQuality', '8k'],
  ] as const;

  it('accepts every setting the interface exposes', () => {
    for (const [key, value] of accepted) {
      expect(parseAction({ type: 'set_setting', key, value }), `${key}=${String(value)}`).toEqual({
        type: 'set_setting',
        key,
        value,
      });
    }
  });

  it('rejects a wrong type for a known key and an unknown value', () => {
    expect(parseAction({ type: 'set_setting', key: 'captionSize', value: 'xl' })).toBeNull();
    expect(parseAction({ type: 'set_setting', key: 'earcons', value: 'yes' })).toBeNull();
    expect(parseAction({ type: 'set_setting', key: 'unknown', value: true })).toBeNull();
  });
});

describe('settings reducer', () => {
  it('starts at the PRD defaults: −12 dB, interface sounds on, captions off', () => {
    expect(DEFAULT_SETTINGS.masterVolumeDb).toBe(-12);
    expect(DEFAULT_SETTINGS.earcons).toBe(true);
    expect(DEFAULT_SETTINGS.haptics).toBe(true);
    expect(DEFAULT_SETTINGS.spaceToTalk).toBe(false);
    expect(DEFAULT_SETTINGS.captionSize).toBe('md');
  });

  it('clamps the volume and the speech rate', () => {
    const loud = reduceApp(initialAppData(), {
      type: 'set_setting',
      key: 'masterVolumeDb',
      value: 12,
    });
    expect(loud.settings.masterVolumeDb).toBe(0);
    const quiet = reduceApp(initialAppData(), {
      type: 'set_setting',
      key: 'masterVolumeDb',
      value: -99,
    });
    expect(quiet.settings.masterVolumeDb).toBe(-40);
    const fast = reduceApp(initialAppData(), { type: 'set_setting', key: 'speechRate', value: 3 });
    expect(fast.settings.speechRate).toBe(1.4);
  });

  it('keeps the new toggles and the caption size', () => {
    let state = initialAppData();
    state = reduceApp(state, { type: 'set_setting', key: 'earcons', value: false });
    state = reduceApp(state, { type: 'set_setting', key: 'captionSize', value: 'lg' });
    expect(state.settings.earcons).toBe(false);
    expect(state.settings.captionSize).toBe('lg');
  });
});
