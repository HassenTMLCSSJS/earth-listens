export const INTRO_DURATION = 100;

export type IntroRunMode = 'clock' | 'scroll';

export interface IntroTimeline {
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  readonly duration: number;
  onScene(cb: (scene: number) => void): () => void;
  onTime(cb: (seconds: number) => void): () => void;
  setMode(m: IntroRunMode): void;
}

export interface IntroStart {
  locale: 'en' | 'ar';
  mode: 'listening' | 'visual';
}

/** Scene index 1..8 from the storyboard boundaries 10 · 22 · 36 · 48 · 64 · 78 · 88. */
export function sceneForTime(seconds: number): number {
  const t = Math.min(INTRO_DURATION, Math.max(0, seconds));
  if (t >= 88) return 8;
  if (t >= 78) return 7;
  if (t >= 64) return 6;
  if (t >= 48) return 5;
  if (t >= 36) return 4;
  if (t >= 22) return 3;
  if (t >= 10) return 2;
  return 1;
}

type Step = (cb: (elapsedMs: number) => void) => () => void;

function defaultStep(cb: (elapsedMs: number) => void): () => void {
  if (typeof requestAnimationFrame !== 'function') return () => undefined;
  let last = performance.now();
  let frame = 0;
  const loop = (now: number) => {
    cb(now - last);
    last = now;
    frame = requestAnimationFrame(loop);
  };
  frame = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(frame);
}

export function createIntroTimeline(options?: { step?: Step }): IntroTimeline {
  let seconds = 0;
  let mode: IntroRunMode = 'clock';
  let scene = 1;
  let stop: (() => void) | null = null;
  const sceneListeners = new Set<(value: number) => void>();
  const timeListeners = new Set<(value: number) => void>();

  const emit = (next: number) => {
    seconds = Math.min(INTRO_DURATION, Math.max(0, next));
    const nextScene = sceneForTime(seconds);
    if (nextScene !== scene) {
      scene = nextScene;
      for (const listener of sceneListeners) listener(scene);
    }
    for (const listener of timeListeners) listener(seconds);
  };

  return {
    duration: INTRO_DURATION,
    play() {
      if (stop) return;
      const step = options?.step ?? defaultStep;
      stop = step((elapsedMs) => {
        if (mode !== 'clock') return;
        emit(seconds + elapsedMs / 1000);
        if (seconds >= INTRO_DURATION) {
          stop?.();
          stop = null;
        }
      });
    },
    pause() {
      stop?.();
      stop = null;
    },
    seek(value) {
      emit(value);
    },
    onScene(cb) {
      sceneListeners.add(cb);
      return () => sceneListeners.delete(cb);
    },
    onTime(cb) {
      timeListeners.add(cb);
      return () => timeListeners.delete(cb);
    },
    setMode(next) {
      mode = next;
    },
  };
}

let active: IntroTimeline | null = null;
let lastStart: IntroStart | null = null;

/** Single entry Hassan's gate calls. Placeholder scenes listen to the timeline. */
export function startIntro(opts: IntroStart): IntroTimeline {
  lastStart = opts;
  active?.pause();
  const timeline = createIntroTimeline();
  timeline.setMode('clock');
  timeline.play();
  active = timeline;
  return timeline;
}

export function getIntroTimeline(): IntroTimeline | null {
  return active;
}

export function lastIntroStart(): IntroStart | null {
  return lastStart;
}
