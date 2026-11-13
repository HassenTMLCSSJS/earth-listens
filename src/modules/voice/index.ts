import type { Lang } from '@/core/actions';

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
    const json = (await response.json()) as { text?: string };
    return json.text ?? '';
  },
};

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
    await playRaw(audio, opts.signal);
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
    await playUrl(URL.createObjectURL(wav), opts.signal);
  },
};

export const speechSynthesisTts: TtsEngine = {
  id: 'speech-synthesis',
  supports: () => true,
  async available() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  },
  async speak(text, lang, opts) {
    if (!('speechSynthesis' in window)) return;
    await new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'ar' ? 'ar-EG' : 'en-US';
      utterance.rate = opts.rate;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      const onAbort = () => {
        window.speechSynthesis.cancel();
        resolve();
      };
      opts.signal.addEventListener('abort', onAbort, { once: true });
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });
  },
};

async function playUrl(url: string, signal: AbortSignal): Promise<void> {
  const audio = new Audio(url);
  await new Promise<void>((resolve) => {
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    signal.addEventListener('abort', () => {
      audio.pause();
      resolve();
    });
    void audio.play().catch(() => resolve());
  });
}

async function playRaw(
  audio: { toBlob?: () => Blob; audio?: Float32Array; sampling_rate?: number },
  signal: AbortSignal,
): Promise<void> {
  if (audio.toBlob) {
    await playUrl(URL.createObjectURL(audio.toBlob()), signal);
  }
}

export async function speakText(
  text: string,
  lang: Lang,
  opts: { demo: boolean; rate: number; signal?: AbortSignal },
): Promise<void> {
  const signal = opts.signal ?? new AbortController().signal;
  const chain: TtsEngine[] = [];
  if (!opts.demo) {
    if (lang === 'en') chain.push(kokoroTts);
    if (lang === 'ar') chain.push(piperTts);
  }
  chain.push(speechSynthesisTts);
  for (const engine of chain) {
    if (!engine.supports(lang)) continue;
    try {
      if (!(await engine.available())) continue;
      await engine.speak(text, lang, { rate: opts.rate, signal });
      return;
    } catch {
      continue;
    }
  }
}
