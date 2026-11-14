'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import type { Lang, Mode, NavHref } from '@/core/actions';
import { subscribe } from '@/core/bus';
import { useAppStore } from '@/core/store';
import { isTypingTarget } from '@/modules/a11y';
import { initialEntry, reduceEntry, type EntryEvent, type EntryState } from '@/modules/entry';
import { narrationText, speakNarration } from '@/modules/narration';
import { ChoiceHub } from '@/components/entry/choice-hub';
import { IntroStage } from '@/components/entry/intro-stage';
import { PreEntryGate } from '@/components/entry/pre-entry-gate';

const HUB_KEYS: NavHref[] = ['/listen', '/tutorial', '/how-it-sounds', '/quiz'];

interface SavedPrefs {
  lang: Lang;
  mode: Mode;
}

function readPrefs(): SavedPrefs | null {
  try {
    const raw = localStorage.getItem('el.prefs.v1');
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SavedPrefs>;
      if (parsed.mode === 'audio_first' || parsed.mode === 'visual') {
        return { lang: parsed.lang === 'ar' ? 'ar' : 'en', mode: parsed.mode };
      }
    }
    const legacy = localStorage.getItem('el.mode');
    if (legacy === 'audio_first' || legacy === 'visual') {
      return { lang: document.documentElement.lang === 'ar' ? 'ar' : 'en', mode: legacy };
    }
  } catch {
    return null;
  }
  return null;
}

export function HomeExperience() {
  const locale = useLocale() === 'ar' ? 'ar' : 'en';
  const dispatch = useAppStore((state) => state.dispatch);
  const markIntroSeen = useAppStore((state) => state.markIntroSeen);
  const demo = useAppStore((state) => state.demo);
  const setHub = useAppStore((state) => state.setHub);
  const [entry, setEntry] = useState<EntryState>(() => initialEntry(locale));
  const entryRef = useRef(entry);
  const send = useCallback((event: EntryEvent) => {
    setEntry((current) => reduceEntry(current, event));
  }, []);

  useEffect(() => {
    entryRef.current = entry;
  }, [entry]);

  // The chrome only appears once the visitor reaches the hub: no header over
  // the gate or the intro, exactly like the mockups.
  useEffect(() => {
    setHub(entry.phase === 'hub');
    return () => setHub(false);
  }, [entry.phase, setHub]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const replay = sessionStorage.getItem('el.replay') === '1';
      if (replay) sessionStorage.removeItem('el.replay');
      const prefs = readPrefs();
      if (!prefs) return;
      send({
        type: 'boot',
        introSeen: replay ? false : localStorage.getItem('el.introSeen') === '1',
        savedMode: prefs.mode,
        lang: prefs.lang,
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [send]);

  useEffect(() => {
    return subscribe('skip', () => {
      if (entryRef.current.phase === 'hub') return;
      send({ type: 'skip' });
    });
  }, [send]);

  useEffect(() => {
    if (!entry.mode) return;
    const prefs = {
      lang: entry.lang,
      mode: entry.mode,
      modeSource: entry.modeSource,
      decidedAt: Date.now(),
    };
    localStorage.setItem('el.prefs.v1', JSON.stringify(prefs));
    localStorage.setItem('el.mode', entry.mode);
    dispatch({ type: 'set_mode', mode: entry.mode }, 'system');
    if (entry.lang !== locale) dispatch({ type: 'set_language', lang: entry.lang }, 'voice');
  }, [dispatch, entry.lang, entry.mode, entry.modeSource, locale]);

  useEffect(() => {
    if (entry.phase === 'hub') markIntroSeen(true);
    if ((entry.phase === 'hub' || entry.phase === 'intro') && entry.line) {
      void speakNarration(entry.line, entry.lang);
    }
  }, [entry.lang, entry.line, entry.phase, markIntroSeen]);

  useEffect(() => {
    if (entry.phase !== 'prompt' && entry.phase !== 'reprompt') return;
    const line = entry.line;
    if (!line) return;
    let dead = false;
    void speakNarration(line, entry.lang);
    const timer = window.setTimeout(
      () => {
        if (dead) return;
        send({ type: entry.phase === 'prompt' ? 'prompt_done' : 'reprompt_done' });
      },
      entry.phase === 'prompt' ? 900 : 700,
    );
    return () => {
      dead = true;
      window.clearTimeout(timer);
    };
  }, [entry.lang, entry.line, entry.phase, send]);

  useEffect(() => {
    if (entry.phase !== 'listen1' && entry.phase !== 'listen2') return;
    if (demo) return;
    let dead = false;
    const timer = window.setTimeout(() => {
      if (!dead) send({ type: 'silence' });
    }, 8000);
    const listen = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        send({ type: 'mic_denied' });
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (dead) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data);
        };
        const stopped = new Promise<void>((resolve) => {
          recorder.onstop = () => resolve();
        });
        recorder.start();
        await new Promise((resolve) => window.setTimeout(resolve, 3500));
        if (recorder.state !== 'inactive') recorder.stop();
        await stopped;
        stream.getTracks().forEach((track) => track.stop());
        if (dead || chunks.length === 0) return;
        const { transcribeClip } = await import('@/modules/voice');
        const heard = await transcribeClip(
          new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }),
          entryRef.current.lang,
          AbortSignal.timeout(6000),
        );
        if (!dead && heard.text.trim()) {
          send({ type: 'speech', text: heard.text, lang: heard.language });
        }
      } catch {
        if (!dead) send({ type: 'mic_denied' });
      }
    };
    void listen();
    return () => {
      dead = true;
      window.clearTimeout(timer);
    };
  }, [demo, entry.phase, send]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const phase = entryRef.current.phase;
      if (phase === 'hub' && ['1', '2', '3', '4'].includes(event.key)) {
        event.preventDefault();
        const href = HUB_KEYS[Number(event.key) - 1];
        if (href) dispatch({ type: 'navigate', href }, 'keyboard');
        return;
      }
      if (
        (phase === 'listen1' || phase === 'listen2') &&
        (event.key === ' ' || event.key === 'Enter')
      ) {
        event.preventDefault();
        send({ type: 'space' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, send]);

  const caption = entry.line && entry.phase !== 'pre' ? narrationText(entry.line)[entry.lang] : '';
  const listening = entry.mode === 'audio_first' ? 'listening' : 'visual';

  return (
    <div data-testid="entry-state" data-state={entry.phase}>
      {entry.phase === 'pre' ||
      entry.phase === 'prompt' ||
      entry.phase === 'listen1' ||
      entry.phase === 'reprompt' ||
      entry.phase === 'listen2' ? (
        <PreEntryGate
          onSound={(gesture) => send({ type: 'sound', gesture })}
          onLanguage={(lang) => send({ type: 'language', lang })}
        />
      ) : null}
      {caption && entry.phase !== 'intro' && entry.phase !== 'hub' ? (
        <p className="fixed inset-x-4 bottom-6 z-50 text-center text-lg" aria-live="polite">
          {caption}
        </p>
      ) : null}
      {entry.phase === 'intro' ? (
        <IntroStage
          lang={entry.lang}
          mode={listening}
          onDone={() => send({ type: 'intro_done' })}
          onSkip={() => send({ type: 'skip' })}
        />
      ) : null}
      {entry.phase === 'hub' ? <ChoiceHub /> : null}
    </div>
  );
}
