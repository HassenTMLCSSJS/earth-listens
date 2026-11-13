import { EARCONS, crackleSeed } from './earcons';
import { clampMasterDb } from './math/volume';
import { mulberry32 } from '@/core/prng';
import type { EarconId, NoteEvent, Score } from './types';

export interface Player {
  init(): Promise<void>;
  play(score: Score, opts?: { onEvent?(event: NoteEvent): void }): void;
  stop(): void;
  setView(view: { lat: number; lon: number }): void;
  earcon(id: EarconId): void;
  analyser(): AnalyserNode | null;
  setMasterVolume(db: number): void;
  duck(db: number): void;
}

interface ToneModule {
  start: () => Promise<void>;
  now: () => number;
  getContext: () => { rawContext: AudioContext };
  Destination: { connect: (node: unknown) => unknown };
  Limiter: new (db: number) => {
    toDestination: () => unknown;
    connect: (node: unknown) => unknown;
  };
  Volume: new (db: number) => {
    connect: (node: unknown) => unknown;
    volume: { value: number; rampTo: (value: number, seconds: number) => void };
  };
  Compressor: new (opts: { threshold: number; ratio: number }) => {
    connect: (node: unknown) => unknown;
  };
  Analyser: new (opts: {
    type: string;
    size: number;
  }) => AnalyserNode & { connect: (node: unknown) => unknown };
  Synth: new (opts?: object) => {
    connect: (node: unknown) => {
      triggerAttackRelease: (freq: number, dur: number, time?: number) => void;
    };
    triggerAttackRelease: (freq: number, dur: number, time?: number) => void;
  };
  PolySynth: new (
    voice: unknown,
    opts?: object,
  ) => {
    connect: (node: unknown) => {
      triggerAttackRelease: (freq: number, dur: number, time?: number) => void;
    };
  };
  Filter: new (freq: number, type: string) => { connect: (node: unknown) => unknown };
  FMSynth: new (opts?: object) => {
    connect: (node: unknown) => {
      triggerAttackRelease: (freq: number, dur: number, time?: number) => void;
    };
  };
  Player: new (buffer: AudioBuffer) => {
    connect: (node: unknown) => unknown;
    start: (time?: number) => void;
  };
  Buffer: { fromArray: (array: Float32Array) => AudioBuffer };
  Panner3D: new (opts: object) => {
    connect: (node: unknown) => unknown;
    positionX: { rampTo: (value: number, seconds: number) => void };
    positionY: { rampTo: (value: number, seconds: number) => void };
    positionZ: { rampTo: (value: number, seconds: number) => void };
  };
  Gain: new (value?: number) => {
    connect: (node: unknown) => unknown;
    gain: { value: number; rampTo: (value: number, seconds: number) => void };
  };
  context: { rawContext: AudioContext };
}

type Panner = {
  positionX: { rampTo: (value: number, seconds: number) => void };
  positionY: { rampTo: (value: number, seconds: number) => void };
  positionZ: { rampTo: (value: number, seconds: number) => void };
};

/**
 * Tone.js adapter. Synthesis parameters live here; the score itself stays pure.
 * Tone is loaded only after a user gesture.
 */
export function createPlayer(): Player {
  let tone: ToneModule | null = null;
  let output: {
    connect: (node: unknown) => unknown;
    volume: { value: number; rampTo: (value: number, seconds: number) => void };
  } | null = null;
  let analyser: AnalyserNode | null = null;
  let bus: { connect: (node: unknown) => unknown } | null = null;
  let started = false;
  let master = -6;
  let duckDb = 0;
  const panners = new Map<string, Panner>();
  let timer: ReturnType<typeof setInterval> | null = null;
  const scheduled: unknown[] = [];

  function applyVolume(): void {
    if (!output) return;
    output.volume.rampTo(clampMasterDb(master) + duckDb, 0.05);
  }

  async function init(): Promise<void> {
    if (started) return;
    const imported = await import('tone');
    // boundary: Tone's public types vary across minor versions; the runtime shape used here is fixed.
    tone = imported as unknown as ToneModule;
    await tone.start();
    const limiter = new tone.Limiter(-1).toDestination();
    output = new tone.Volume(clampMasterDb(master));
    output.connect(limiter);
    const compressor = new tone.Compressor({ threshold: -18, ratio: 3 });
    compressor.connect(output);
    const analysed = new tone.Analyser({ type: 'waveform', size: 256 });
    analysed.connect(compressor);
    analyser = analysed;
    bus = analysed;
    started = true;
  }

  function noiseBuffer(): AudioBuffer | null {
    if (!tone) return null;
    const rand = mulberry32(crackleSeed());
    const length = Math.floor(tone.getContext().rawContext.sampleRate * 0.03);
    const data = new Float32Array(length);
    for (let i = 0; i < length; i += 1) {
      const env = Math.exp(-8 * (i / length));
      data[i] = (rand() * 2 - 1) * env;
    }
    return tone.Buffer.fromArray(data);
  }

  function playNote(event: NoteEvent, when: number): void {
    if (!tone || !bus || event.flags.missing || event.freqHz <= 0) return;
    const panner = new tone.Panner3D({
      panningModel: 'HRTF',
      distanceModel: 'linear',
      rolloffFactor: 0,
      refDistance: 1,
      positionX: event.pos.x,
      positionY: event.pos.y,
      positionZ: event.pos.z,
    });
    panner.connect(bus);
    panners.set(event.voiceId, panner);
    const gain = new tone.Gain(10 ** (event.gainDb / 20));
    gain.connect(panner);
    if (!started) return;
    const synth = new tone.Synth({ oscillator: { type: 'sine' } });
    synth.connect(gain);
    synth.triggerAttackRelease(event.freqHz, Math.max(0.05, event.dur), when);
    scheduled.push(synth);
  }

  return {
    async init() {
      await init();
    },
    play(score, opts) {
      if (!tone) return;
      this.stop();
      const start = tone.now();
      if (output) output.volume.value = clampMasterDb(master) - 12;
      applyVolume();
      output?.volume.rampTo(clampMasterDb(master) + duckDb, 0.5);
      for (const event of score.events) {
        playNote(event, start + event.t);
        const fireAt = globalThis.setTimeout(() => opts?.onEvent?.(event), event.t * 1000);
        scheduled.push(fireAt);
      }
      for (const earcon of score.earcons) {
        const fireAt = globalThis.setTimeout(() => this.earcon(earcon.id), earcon.t * 1000);
        scheduled.push(fireAt);
      }
    },
    stop() {
      for (const item of scheduled) {
        if (typeof item === 'number') globalThis.clearTimeout(item);
      }
      scheduled.length = 0;
      panners.clear();
      if (timer) window.clearInterval(timer);
      timer = null;
    },
    setView(view) {
      for (const panner of panners.values()) {
        panner.positionX.rampTo(Math.sin((view.lon * Math.PI) / 180) * 0.5, 0.05);
        panner.positionY.rampTo(Math.sin((view.lat * Math.PI) / 180) * 0.5, 0.05);
      }
    },
    earcon(id) {
      if (!tone || !bus) return;
      const spec = EARCONS[id];
      const synth = new tone.Synth({ oscillator: { type: spec.wave } });
      const gain = new tone.Gain(10 ** (spec.gainDb / 20));
      gain.connect(bus);
      synth.connect(gain);
      const now = tone.now();
      spec.freqs.forEach((freq, index) => {
        synth.triggerAttackRelease(freq, spec.ms / 1000, now + index * 0.05);
      });
      if (id === 'missing') {
        const buffer = noiseBuffer();
        if (buffer) {
          const player = new tone.Player(buffer);
          player.connect(gain);
          player.start(now);
        }
      }
    },
    analyser() {
      return analyser;
    },
    setMasterVolume(db) {
      master = clampMasterDb(db);
      applyVolume();
    },
    duck(db) {
      duckDb = db;
      applyVolume();
    },
  };
}
