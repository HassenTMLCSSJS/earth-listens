import type { Lang } from '@/core/actions';
// eslint-disable-next-line no-restricted-imports
import { findNarrationClip } from '@/modules/voice/clips';

export interface SayOptions {
  text: string;
  lang: Lang;
  rate?: number;
  signal?: AbortSignal;
}
interface QueueItem extends SayOptions {
  lineId: string;
  resolve: () => void;
  reject: (error: unknown) => void;
}

const synth = (): SpeechSynthesis | null =>
  typeof window !== 'undefined' && 'speechSynthesis' in window
    ? window.speechSynthesis
    : null;

class NarrationQueue {
  private audio: HTMLAudioElement | null = null;
  private items: QueueItem[] = [];
  private running = false;
  private cancelCurrent: (() => void) | null = null;
  private unlocked = false;
  private context: AudioContext | null = null;

  /** One shared element for every spoken line in the app. */
  private getAudio(): HTMLAudioElement {
    if (!this.audio) this.audio = new Audio();
    return this.audio;
  }

  say(lineId: string, opts: SayOptions): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.items.push({ ...opts, lineId, resolve, reject });
      void this.drain();
    });
  }

  get isSpeaking(): boolean {
    return this.running;
  }

  stop(): void {
    const pending = this.items.splice(0, this.items.length);
    for (const item of pending) item.resolve();
    this.cancelCurrent?.();
    this.audio?.pause();
    synth()?.cancel();
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    const item = this.items.shift();
    if (!item) return;
    this.running = true;
    try {
      await this.playItem(item);
    } catch {
      /* The caption already carries the line. */
    } finally {
      item.resolve();
      this.running = false;
      void this.drain();
    }
  }

  private async playItem(item: QueueItem): Promise<void> {
    const clip = await findNarrationClip(item.lang, item.text);
    if (clip && (await this.playUrl(clip.url, item.signal))) return;
    await this.playSynthesis(item);
  }

  /**
   * Returns true when the MP3 played. The speech fallback is used only when the
   * MP3 is missing or fails to load, never because playback is slow.
   */
  playUrl(url: string, signal?: AbortSignal): Promise<boolean> {
    const audio = this.getAudio();
    return new Promise<boolean>((resolve) => {
      if (!audio) return resolve(false);
      let settled = false;
      const cleanup = () => {
        signal?.removeEventListener('abort', onAbort);
        if (audio.onended === onEnded) audio.onended = null;
        if (audio.onerror === onError) audio.onerror = null;
      };
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        cleanup();
        audio.pause();
        resolve(ok);
      };
      const onEnded = () => finish(true);
      const onError = () => finish(false);
      const onAbort = () => finish(true);
      signal?.addEventListener('abort', onAbort, { once: true });
      this.cancelCurrent = () => finish(true);
      audio.pause();
      audio.currentTime = 0;
      audio.src = url;
      audio.onended = onEnded;
      audio.onerror = onError;
      audio.play().catch(() => finish(false));
    });
  }

  private playSynthesis(item: QueueItem): Promise<void> {
    return new Promise<void>((resolve) => {
      const engine = synth();
      if (!engine) return resolve();
      const utterance = new SpeechSynthesisUtterance(item.text);
      utterance.lang = item.lang === 'ar' ? 'ar-EG' : 'en-US';
      utterance.rate = item.rate ?? 1;
      const onEnd = () => resolve();
      const onError = () => resolve();
      utterance.onend = onEnd;
      utterance.onerror = onError;
      const onAbort = () => {
        engine.cancel();
        resolve();
      };
      item.signal?.addEventListener('abort', onAbort, { once: true });
      this.cancelCurrent = onAbort;
      engine.cancel();
      engine.speak(utterance);
    });
  }

  /** Call once from the entry gate's first user gesture. */
  unlockNarrationAudio(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    if (typeof window === 'undefined') return;
    try {
      const AudioContextCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;
      this.context ??= new AudioContextCtor();
      const buffer = this.context.createBuffer(1, 1, 22050);
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.context.destination);
      source.start(0);
      void this.context.resume();
    } catch {
      /* Unlock is best effort; playback still works after a gesture. */
    }
  }
}

export const narrationQueue = new NarrationQueue();

/** Convenience alias so call sites read naturally. */
export function unlockNarrationAudio(): void {
  narrationQueue.unlockNarrationAudio();
}

/** Shared playback helper for engines that produce an audio URL. */
export function playSharedUrl(url: string, signal?: AbortSignal): Promise<boolean> {
  return narrationQueue.playUrl(url, signal);
}
