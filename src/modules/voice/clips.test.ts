/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  narrationKey,
  preloadNarrationClips,
  resetNarrationClipsForTests,
  speakText,
} from '@/modules/voice';

const played: string[] = [];
const spoken: string[] = [];

beforeEach(() => {
  played.length = 0;
  spoken.length = 0;
  resetNarrationClipsForTests();
  vi.stubGlobal(
    'Audio',
    class {
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = '';
      constructor(src?: string) {
        if (src) this.src = src;
      }
      set src(value: string) {
        this._src = value;
        played.push(value);
      }
      get src() {
        return this._src;
      }
      play() {
        this.onended?.();
        return Promise.resolve();
      }
      pause() {}
    },
  );
  class Utterance {
    lang = '';
    rate = 1;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(public text: string) {}
  }
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      cancel() {},
      speak(utterance: { text: string; onend?: () => void }) {
        spoken.push(utterance.text);
        utterance.onend?.();
      },
    },
  });
});

describe('pre-rendered narration', () => {
  it('matches the Python sha256 of lang, newline, and text', async () => {
    await expect(narrationKey('en', 'Earth is always making a sound.')).resolves.toBe(
      'edbf3fa1a9a37c0096759cb86926847f5e5838dcbc4e72af6a8b78d68a483306',
    );
  });

  it('finds the matching clip on first use without preloading', async () => {
    const text = 'Earth is always making a sound.';
    const hash = await narrationKey('en', text);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).endsWith('.mp3')) return { ok: true, blob: async () => new Blob(['mp3']) };
        return {
          ok: true,
          json: async () => ({
            items: [{ hash, lang: 'en', url: `/audio/narration/en/${hash}.mp3`, duration: 1.9 }],
          }),
        };
      }),
    );
    await speakText(text, 'en', { demo: true, rate: 1, neural: true });
    expect(played[0]).toBe(`/audio/narration/en/${hash}.mp3`);
    expect(spoken).toEqual([]);
  });

  it('preload swaps the clip URLs to local blobs for offline playback', async () => {
    const text = 'Earth is always making a sound.';
    const hash = await narrationKey('en', text);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).endsWith('.mp3')) return { ok: true, blob: async () => new Blob(['mp3']) };
        return {
          ok: true,
          json: async () => ({
            items: [{ hash, lang: 'en', url: `/audio/narration/en/${hash}.mp3`, duration: 1.9 }],
          }),
        };
      }),
    );
    await preloadNarrationClips();
    await speakText(text, 'en', { demo: true, rate: 1, neural: true });
    expect(played[0]?.startsWith('blob:')).toBe(true);
    expect(spoken).toEqual([]);
  });

  it('falls through to speechSynthesis when no clip is loaded', async () => {
    await speakText('A dynamic reply.', 'en', { demo: true, rate: 1, neural: true });
    expect(played).toEqual([]);
    expect(spoken).toEqual(['A dynamic reply.']);
  });
});
