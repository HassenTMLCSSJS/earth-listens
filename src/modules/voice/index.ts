import type { Lang } from '@/core/actions';
import { resolveHeardLanguage } from './language';
import { narrationQueue, playSharedUrl } from '@/lib/audio/narration-queue';

export { narrationKey, preloadNarrationClips, resetNarrationClipsForTests } from './clips';
export { resolveHeardLanguage };

interface WebSpeech {
  lang: string;
  onresult: ((event: { results: { 0?: { 0?: { transcript?: string } } } }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
}

export interface SttEngine {
  id: string;
  available(): Promise<boolean>;
  transcribe(audio: Blob, lang: Lang, signal: AbortSignal): Promise<string>;
}

export interface TtsEngine {
  id: string;
  supports(lang: Lang): boolean;
  available(): Promise<boolean>;
  speak(text: string, lang: Lang, opts: { rate: number; signal: AbortSignal }): Promise<void>;
}

const AR_VOICE = 'ar_JO-kareem-medium';

export const groqWhisperStt: SttEngine = {
  id: 'groq-whisper',
  async available() {
    return typeof navigator !== 'undefined' && navigator.onLine;
  },
  async transcribe(audio, lang, signal) {
    const body = new FormData();
    body.set('file', audio, 'speech.webm');
    body.set('lang', lang);
    const response = await fetch('/api/stt', { method: 'POST', body, signal });
    if (!response.ok) throw new Error('stt failed');
    const json = (await response.json()) as { text?: string; language?: string };
    return json.text ?? '';
  },
};

/** Groq Whisper with the selected language forced. Switches when the words are the other language. */
export async function transcribeClip(
  audio: Blob,
  lang: Lang,
  signal: AbortSignal,
): Promise<{ text: string; language: Lang }> {
  const body = new FormData();
  body.set('file', audio, 'speech.webm');
  body.set('lang', lang);
  const response = await fetch('/api/stt', { method: 'POST', body, signal });
  if (!response.ok) throw new Error('stt failed');
  const json = (await response.json()) as { text?: string; language?: Lang };
  const text = json.text ?? '';
  return {
    text,
    language: resolveHeardLanguage({ text, reported: json.language, forced: lang }),
  };
}

export const webSpeechStt: SttEngine = {
  id: 'web-speech',
  async available() {
    if (typeof window === 'undefined') return false;
    const host = window as Window & {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    return Boolean(host.SpeechRecognition || host.webkitSpeechRecognition);
  },
  async transcribe(_audio, lang) {
    const host = window as Window & {
      SpeechRecognition?: new () => WebSpeech;
      webkitSpeechRecognition?: new () => WebSpeech;
    };
    const Ctor = host.SpeechRecognition ?? host.webkitSpeechRecognition;
    if (!Ctor) throw new Error('web speech missing');
    return new Promise((resolve, reject) => {
      const rec = new Ctor();
      rec.lang = lang === 'ar' ? 'ar-EG' : 'en-US';
      rec.onresult = (event) => resolve(event.results[0]?.[0]?.transcript ?? '');
      rec.onerror = () => reject(new Error('web speech error'));
      rec.start();
    });
  },
};

export const typedStt: SttEngine = {
  id: 'typed',
  async available() {
    return true;
  },
  async transcribe() {
    return '';
  },
};

export const kokoroTts: TtsEngine = {
  id: 'kokoro',
  supports: (lang) => lang === 'en',
  async available() {
    return typeof window !== 'undefined';
  },
  async speak(text, _lang, opts) {
    const { KokoroTTS } = await import('kokoro-js');
    const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
      dtype: 'q8',
    });
    const audio = await tts.generate(text, { voice: 'af_heart', speed: opts.rate });
    if (audio.toBlob) await playSharedUrl(URL.createObjectURL(audio.toBlob()), opts.signal);
  },
};

export const piperTts: TtsEngine = {
  id: 'piper',
  supports: (lang) => lang === 'ar',
  async available() {
    return typeof window !== 'undefined';
  },
  async speak(text, _lang, opts) {
    const tts = (await import('@mintplex-labs/piper-tts-web')) as {
      voices: () => Promise<{ key?: string }[] | Record<string, unknown>>;
      predict: (opts: { text: string; voiceId: string }) => Promise<Blob>;
    };
    const voices = await tts.voices();
    const keys = Array.isArray(voices) ? voices.map((voice) => voice.key) : Object.keys(voices);
    if (!keys.includes(AR_VOICE)) throw new Error('arabic voice missing');
    const wav = await tts.predict({ text, voiceId: AR_VOICE });
    await playSharedUrl(URL.createObjectURL(wav), opts.signal);
  },
};

export const speechSynthesisTts: TtsEngine = {
  id: 'speech-synthesis',
  supports: () => true,
  async available() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  },
  async speak(text, lang, opts) {
    await narrationQueue.say(text, { text, lang, rate: opts.rate, signal: opts.signal });
  },
};

export async function speakText(
  text: string,
  lang: Lang,
  opts: { demo: boolean; rate: number; signal?: AbortSignal; neural?: boolean },
): Promise<void> {
  const signal = opts.signal ?? new AbortController().signal;
  await narrationQueue.say(text, { text, lang, rate: opts.rate, signal });
}
