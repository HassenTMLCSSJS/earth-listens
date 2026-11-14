/**
 * @vitest-environment jsdom
 */
import { readFile } from 'node:fs/promises';
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
    Limiter: class extends Chain {
      constructor(_db?: number) {
        super();
      }
    },
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

vi.mock('kokoro-js', () => ({
  KokoroTTS: {
    from_pretrained: async () => ({
      generate: async () => ({ toBlob: () => new Blob(['a']) }),
    }),
  },
}));

vi.mock('@mintplex-labs/piper-tts-web', () => ({
  voices: async () => [{ key: 'ar_JO-kareem-medium' }],
  predict: async () => new Blob(['a']),
}));

import { isTypingTarget, SHORTCUTS } from '@/modules/a11y';
import { runAgent } from '@/modules/agent';
import { loadRegistry } from '@/modules/data';
import { regionCentre } from '@/modules/data';
import { announce, resetAnnouncements, speakNarration, withSampleNote } from '@/modules/narration';
import { quizCsv } from '@/modules/quiz';
import { crackleSeed, createPlayer } from '@/modules/sonification';
import { TUTORIAL_STEPS } from '@/modules/tutorial';
import { kokoroTts, piperTts, speakText } from '@/modules/voice';

beforeEach(() => {
  resetAnnouncements();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (String(url).includes('chat/completions')) {
        return {
          ok: true,
          json: async () => ({
            choices: [
              { message: { tool_calls: [{ function: { name: 'help', arguments: '{}' } }] } },
            ],
          }),
        };
      }
      const file = `public${String(url)}`;
      return { ok: true, json: async () => JSON.parse(await readFile(file, 'utf8')) };
    }),
  );
  vi.stubGlobal(
    'Audio',
    class {
      onended: (() => void) | null = null;
      play() {
        this.onended?.();
        return Promise.resolve();
      }
      pause() {}
    },
  );
  if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:sample';
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      cancel() {},
      speak(utterance: { onend?: () => void }) {
        utterance.onend?.();
      },
    },
  });
});

describe('module runtime paths', () => {
  it('loads the recorded registry through the data contract', async () => {
    const registry = await loadRegistry();
    const layer = await registry.get('temperature');
    expect(layer.isSample).toBe(false);
    expect(layer.data.sample).toBe(false);
    expect(layer.data.series.global?.[0]?.v).toBeCloseTo(-0.18);
    const sample = await registry.get('wildfire');
    expect(sample.isSample).toBe(true);
    expect(regionCentre('egypt')).toEqual({ lat: 26.8, lon: 30.8 });
    expect(registry.list().map((item) => item.id)).toContain('co2');
  });

  it('plays a score through the tone adapter', async () => {
    const player = createPlayer();
    await player.init();
    player.setMasterVolume(3);
    player.duck(-10);
    player.play({
      mode: 'sweep',
      duration: 0.3,
      events: [
        {
          t: 0,
          dur: 0.2,
          layerId: 'temperature',
          voiceId: 'temperature:global',
          midiRaw: 60,
          midi: 60,
          freqHz: 261.6,
          gainDb: -18,
          pan: 0,
          pos: { x: 0, y: 0, z: -1 },
          lowpassHz: 20000,
          ticks: 1,
          flags: { missing: false, outOfRange: false, record: false },
          source: { t: 2000, v: 0 },
        },
        {
          t: 0,
          dur: 0.2,
          layerId: 'wildfire',
          voiceId: 'wildfire:0,0',
          midiRaw: 70,
          midi: 70,
          freqHz: 466,
          gainDb: -18,
          pan: 0.2,
          pos: { x: 0.2, y: 0, z: -1 },
          lowpassHz: 20000,
          ticks: 2,
          flags: { missing: false, outOfRange: false, record: false },
          source: { t: '2025-08-04', v: 4 },
        },
        {
          t: 0,
          dur: 0.2,
          layerId: 'sea_ice',
          voiceId: 'sea_ice:arctic',
          midiRaw: 80,
          midi: 80,
          freqHz: 830,
          gainDb: -18,
          pan: 0,
          pos: { x: 0, y: 0.4, z: -1 },
          lowpassHz: 20000,
          ticks: 1,
          flags: { missing: false, outOfRange: false, record: false },
          source: { t: 2020, v: 5 },
        },
        {
          t: 0,
          dur: 0.2,
          layerId: 'co2',
          voiceId: 'co2:global',
          midiRaw: 40,
          midi: 40,
          freqHz: 82,
          gainDb: -18,
          pan: 0,
          pos: { x: 0, y: 0, z: -1 },
          lowpassHz: 20000,
          ticks: 1,
          flags: { missing: false, outOfRange: false, record: false },
          source: { t: 2020, v: 410 },
        },
      ],
      earcons: [{ t: 0, id: 'missing' }],
    });
    player.setView({ lat: 10, lon: 20 });
    player.earcon('start');
    player.earcon('missing');
    expect(player.analyser()).toBeTruthy();
    player.stop();
    expect(crackleSeed()).toBeGreaterThan(0);
  });

  it('speaks with the local engines and the demo fallback', async () => {
    const signal = new AbortController().signal;
    await kokoroTts.speak('hello', 'en', { rate: 1, signal });
    await piperTts.speak('أهلا', 'ar', { rate: 1, signal });
    await speakText('caption', 'en', { demo: true, rate: 1, signal });
    await speakNarration('intro.line1', 'en', { sample: true });
    expect(window.__elNarration).toContain('intro.line1');
    expect(
      withSampleNote({ en: 'real NASA measurement', ar: 'قياس حقيقي من ناسا' }, true).en,
    ).toContain('sample data');
    announce({ en: 'Ready', ar: 'جاهز' });
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(window.__elAnnounce?.at(-1)).toBe('Ready');
  });

  it('runs the mock provider and a stubbed http provider', async () => {
    const previous = { ...process.env };
    process.env.AGENT_PROVIDER_ORDER = 'mock';
    process.env.GROQ_API_KEY = '';
    const mocked = await runAgent({ text: 'hello', lang: 'en', state: {}, layerSummary: [] });
    expect(mocked.provider).toBe('mock');
    process.env.AGENT_PROVIDER_ORDER = 'groq';
    process.env.GROQ_API_KEY = 'test-not-a-secret';
    process.env.GROQ_AGENT_MODEL = 'test-model';
    const routed = await runAgent({
      text: 'help',
      lang: 'en',
      state: { layers: ['temperature'] },
      layerSummary: [
        {
          id: 'temperature',
          range: { min: -0.6, max: 1.4 },
          unit: 'C',
          currentValue: 0.2,
          first: 1880,
          last: 2025,
        },
      ],
    });
    expect(routed.actions.some((action) => action.type === 'help')).toBe(true);
    process.env.AGENT_PROVIDER_ORDER = previous.AGENT_PROVIDER_ORDER;
    process.env.GROQ_API_KEY = previous.GROQ_API_KEY;
    process.env.GROQ_AGENT_MODEL = previous.GROQ_AGENT_MODEL;
  });

  it('covers tutorial expectations, shortcuts and the quiz csv', () => {
    const state = {
      layers: ['temperature'] as const,
      region: 'global' as const,
      time: { from: 1880, to: 2025, cursor: 1990 },
    };
    expect(TUTORIAL_STEPS[0]?.expect({ type: 'play' }, { ...state, layers: ['temperature'] })).toBe(
      true,
    );
    expect(
      TUTORIAL_STEPS[1]?.expect(
        { type: 'set_time', from: 1990 },
        { ...state, layers: ['temperature'] },
      ),
    ).toBe(true);
    expect(SHORTCUTS.map((item) => item.id)).toContain('stop');
    expect(isTypingTarget(document.createElement('input'))).toBe(true);
    expect(isTypingTarget(null)).toBe(false);
    const csv = quizCsv([
      {
        sessionId: 's',
        seed: 1,
        group: 'sighted',
        clipId: 'c',
        answer: 'increased',
        truth: 'increased',
        correct: true,
        msToAnswer: 10,
        ts: '2026-01-01T00:00:00.000Z',
      },
      {
        sessionId: 's',
        seed: 1,
        group: 'sighted',
        clipId: 'train',
        answer: 'increased',
        truth: 'increased',
        correct: true,
        msToAnswer: 10,
        ts: '2026-01-01T00:00:00.000Z',
        training: true,
      },
    ]);
    expect(csv).toContain('participant_code');
    expect(csv).not.toContain('train');
  });
});
