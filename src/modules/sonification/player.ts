import { EARCONS, crackleSeed } from './earcons';
import { TIMBRE_PRESETS } from './timbres';
import { clampMasterDb } from './math/volume';
import { mulberry32 } from '@/core/prng';
import type { EarconId, NoteEvent, Score } from './types';

export interface PlayOptions {
  onEvent?(event: NoteEvent): void;
  /** Tremolo depth for the CO2 drone, 0–1. One seasonal cycle per step. */
  tremoloDepth?(event: NoteEvent): number;
  stepSec?: number;
}

export interface Player {
  init(): Promise<void>;
  play(score: Score, opts?: PlayOptions): void;
  stop(): void;
  setView(view: { lat: number; lon: number }): void;
  earcon(id: EarconId): void;
  analyser(): AnalyserNode | null;
  setMasterVolume(db: number): void;
  duck(db: number): void;
}

interface Connectable {
  connect: (node: unknown) => unknown;
}

interface SynthVoice extends Connectable {
  triggerAttackRelease: (freq: number, dur: number, time?: number) => void;
}

interface OscVoice extends Connectable {
  start: (time?: number) => void;
  stop: (time?: number) => void;
}

interface ToneApi {
  start: () => Promise<void>;
  now: () => number;
  getContext: () => { rawContext: AudioContext; now?: () => number };
  Limiter: new (db: number) => Connectable & { toDestination: () => unknown };
  Volume: new (db: number) => Connectable & {
    volume: { value: number; rampTo: (value: number, seconds: number) => void };
  };
  Compressor: new (opts: { threshold: number; ratio: number }) => Connectable;
  Analyser: new (opts: { type: string; size: number }) => AnalyserNode & Connectable;
  Synth: new (opts?: object) => SynthVoice;
  PolySynth: new (voice: unknown, opts?: object) => SynthVoice;
  FMSynth: new (opts?: object) => SynthVoice;
  Filter: new (freq: number, type: string) => Connectable;
  Oscillator: new (opts?: object) => OscVoice;
  Tremolo: new (opts?: object) => Connectable & { start: () => void };
  Player: new (buffer: unknown) => Connectable & { start: (time?: number) => void };
  Buffer: { fromArray: (array: Float32Array) => unknown };
  Panner3D: new (opts: object) => {
    connect: (node: unknown) => unknown;
    positionX: { rampTo: (value: number, seconds: number) => void };
    positionY: { rampTo: (value: number, seconds: number) => void };
    positionZ: { rampTo: (value: number, seconds: number) => void };
  };
  Gain: new (value?: number) => Connectable & {
    gain: { value: number; rampTo: (value: number, seconds: number) => void };
  };
}

type Panner = {
  positionX: { rampTo: (value: number, seconds: number) => void };
  positionY: { rampTo: (value: number, seconds: number) => void };
  positionZ: { rampTo: (value: number, seconds: number) => void };
};

/**
 * Tone.js adapter. Each layer uses the timbre named in the score.
 * The library itself loads on the first unlock, not with the page.
 */
export function createPlayer(): Player {
  let tone: ToneApi | null = null;
  let output: {
    connect: (node: unknown) => unknown;
    volume: { value: number; rampTo: (value: number, seconds: number) => void };
  } | null = null;
  let analyser: AnalyserNode | null = null;
  let bus: Connectable | null = null;
  let started = false;
  let master = -6;
  let duckDb = 0;
  let crackle: unknown = null;
  const panners = new Map<string, Panner>();
  let timer: ReturnType<typeof setInterval> | null = null;
  const scheduled: unknown[] = [];

  function applyVolume(): void {
    if (!output) return;
    output.volume.rampTo(clampMasterDb(master) + duckDb, 0.05);
  }

  function now(): number {
    if (!tone) return 0;
    return tone.getContext().now?.() ?? tone.now();
  }

  async function init(): Promise<void> {
    if (started) return;
    const imported = await import('tone');
    // boundary: Tone's public types vary across minor versions; the runtime shape used here is fixed.
    tone = imported as unknown as ToneApi;
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
    crackle = noiseBuffer();
    started = true;
  }

  function noiseBuffer(): unknown {
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

  function place(event: NoteEvent): InstanceType<ToneApi['Gain']> | null {
    if (!tone || !bus) return null;
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
    scheduled.push(gain);
    return gain;
  }

  function playNote(event: NoteEvent, when: number, opts?: PlayOptions): void {
    if (!tone || !bus || event.flags.missing || event.freqHz <= 0) return;
    const gain = place(event);
    if (!gain) return;
    const id = TIMBRE_PRESETS[event.layerId].id;
    const dur = Math.max(0.05, event.dur);

    if (id === 'warm-lead') {
      const filter = new tone.Filter(2400, 'lowpass');
      filter.connect(gain);
      const synth = new tone.PolySynth(tone.Synth, {
        oscillator: { type: 'fatsawtooth', count: 3, spread: 20 },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.6, release: 0.3 },
      });
      synth.connect(filter);
      synth.triggerAttackRelease(event.freqHz, dur, when);
      scheduled.push(synth);
      return;
    }

    if (id === 'crackle-marimba') {
      const synth = new tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.2 },
      });
      synth.connect(gain);
      synth.triggerAttackRelease(event.freqHz, dur, when);
      scheduled.push(synth);
      const ticks = Math.max(1, event.ticks);
      for (let tick = 0; tick < ticks; tick += 1) {
        const player = new tone.Player(crackle);
        player.connect(gain);
        player.start(when + tick * 0.03);
        scheduled.push(player);
      }
      return;
    }

    if (id === 'glass-bells') {
      const synth = new tone.FMSynth({
        harmonicity: 3.5,
        modulationIndex: 10,
        oscillator: { type: 'sine' },
        modulation: { type: 'sine' },
        envelope: { attack: 0.001, decay: 1.2, sustain: 0, release: 1.5 },
      });
      synth.connect(gain);
      synth.triggerAttackRelease(event.freqHz, dur, when);
      scheduled.push(synth);
      return;
    }

    const step = opts?.stepSec && opts.stepSec > 0 ? opts.stepSec : 0.3;
    const depth = Math.min(1, Math.max(0, opts?.tremoloDepth?.(event) ?? 0.5));
    const tremolo = new tone.Tremolo({ frequency: 1 / step, depth, type: 'sine' });
    tremolo.start();
    tremolo.connect(gain);
    const low = new tone.Oscillator({ frequency: event.freqHz, type: 'sine' });
    const high = new tone.Oscillator({ frequency: event.freqHz + 3, type: 'sine' });
    low.connect(tremolo);
    high.connect(tremolo);
    low.start(when);
    high.start(when);
    low.stop(when + dur);
    high.stop(when + dur);
    scheduled.push(tremolo, low, high);
  }

  return {
    async init() {
      await init();
    },
    play(score, opts) {
      if (!tone || !output) return;
      this.stop();
      const start = now();
      output.volume.value = clampMasterDb(master) - 12;
      applyVolume();
      output.volume.rampTo(clampMasterDb(master) + duckDb, 0.5);
      for (const event of score.events) {
        playNote(event, start + event.t, opts);
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
      const at = now();
      spec.freqs.forEach((freq, index) => {
        synth.triggerAttackRelease(freq, spec.ms / 1000, at + index * 0.05);
      });
      if (id === 'missing' && crackle) {
        const player = new tone.Player(crackle);
        player.connect(gain);
        player.start(at);
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
