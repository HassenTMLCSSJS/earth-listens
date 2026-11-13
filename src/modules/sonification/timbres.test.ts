/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('tone', () => {
  class Chain {
    connect() {
      return this;
    }
    toDestination() {
      return this;
    }
  }
  return {
    start: vi.fn(async () => undefined),
    now: () => 0,
    getContext: () => ({ rawContext: { sampleRate: 8000 } }),
    Destination: { connect() {} },
    Limiter: class extends Chain {},
    Volume: class extends Chain {
      volume = { value: 0, rampTo() {} };
    },
    Compressor: class extends Chain {},
    Analyser: class extends Chain {},
    Synth: class extends Chain {
      triggerAttackRelease() {}
    },
    PolySynth: class extends Chain {
      triggerAttackRelease() {}
    },
    Filter: class extends Chain {},
    FMSynth: class extends Chain {
      triggerAttackRelease() {}
    },
    Oscillator: class extends Chain {
      start() {}
      stop() {}
    },
    Tremolo: class extends Chain {
      start() {}
    },
    Player: class extends Chain {
      start() {}
    },
    Buffer: { fromArray: () => ({}) },
    Panner3D: class extends Chain {
      positionX = { rampTo() {} };
      positionY = { rampTo() {} };
      positionZ = { rampTo() {} };
    },
    Gain: class extends Chain {
      gain = { value: 1, rampTo() {} };
    },
  };
});

import type { LayerId } from '@/core/actions';
import { createPlayer } from './player';
import { timbreFor } from './timbres';

const note = (layerId: LayerId, voiceId: string) => ({
  t: 0,
  dur: 0.2,
  layerId,
  voiceId,
  midiRaw: 60,
  midi: 60,
  freqHz: 261,
  gainDb: -18,
  pan: 0,
  pos: { x: 0, y: 0, z: -1 },
  lowpassHz: 20000,
  ticks: 1,
  flags: { missing: false, outOfRange: false, record: false },
  source: { t: 2016, v: 1 },
});

describe('new timbres', () => {
  beforeEach(() => {
    vi.stubGlobal('AudioBuffer', class {});
  });

  it('maps species voices and plays each new layer timbre', async () => {
    expect(timbreFor('aerosols', 'aerosols:dust')).toBe('grain-pad');
    expect(timbreFor('aerosols', 'aerosols:sea_salt')).toBe('air-flute');
    expect(timbreFor('air_quality', 'air_quality:nox')).toBe('glass-bells');
    expect(timbreFor('temperature', 'temperature:global')).toBe('warm-lead');
    const player = createPlayer();
    await player.init();
    const layers: LayerId[] = [
      'night_lights',
      'ocean_sst',
      'ocean_currents',
      'aerosols',
      'air_quality',
      'lightning',
    ];
    player.play({
      mode: 'sweep',
      duration: 0.2,
      events: layers.map((layerId) => note(layerId, `${layerId}:global`)),
      earcons: [],
    });
    player.stop();
  });
});
