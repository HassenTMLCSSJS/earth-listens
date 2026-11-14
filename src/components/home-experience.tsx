'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import type { Lang, Mode, NavHref } from '@/core/actions';
import { subscribe } from '@/core/bus';
import { useAppStore } from '@/core/store';
import { isTypingTarget } from '@/modules/a11y';
import {
  initialEntry,
  isVoice,
  reduceEntry,
  type EntryEvent,
  type EntryState,
} from '@/modules/entry';
import { narrationSafetyMs, speakNarration } from '@/modules/narration';
import { getPlayer, unlockAudio } from '@/modules/sonification';
import { ChoiceHub } from '@/components/entry/choice-hub';
import { IntroStage } from '@/components/entry/intro-stage';
import { ListeningPrompt } from '@/components/entry/listening-prompt';
import { PreEntryGate } from '@/components/entry/pre-entry-gate';
import { ReturningSting } from '@/components/entry/returning-sting';

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

async function clipHasVoice(blob: Blob): Promise<boolean> {
  try {
    const Ctor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return true;
    const context = new Ctor();
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    const voice = isVoice(buffer.getChannelData(0));
    await context.close();
    return voice;
  } catch {
    // If the browser cannot decode the clip, keep it rather than record twice.
    return true;
  }
}

export function HomeExperience() {
  const locale = useLocale() === 'ar' ? 'ar' : 'en';
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppStore((state) => state.dispatch);
  const markIntroSeen = useAppStore((state) => state.markIntroSeen);
  const demo = useAppStore((state) => state.demo);
  const haptics = useAppStore((state) => state.settings.haptics);
  const setHub = useAppStore((state) => state.setHub);
  const [entry, setEntry] = useState<EntryState>(() => initialEntry(locale));
  const [heard, setHeard] = useState<string | null>(null);
  const [sting, setSting] = useState(false);
  const entryRef = useRef(entry);
  const send = useCallback((event: EntryEvent) => {
    if (event.type === 'boot' || event.type === 'replay') setHeard(null);
    setEntry((current) => reduceEntry(current, event));
  }, []);
  const dismissSting = useCallback(() => setSting(false), []);

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
      const introSeen = replay ? false : localStorage.getItem('el.introSeen') === '1';
      if (!replay && introSeen) setSting(true);
      send({
        type: 'boot',
        introSeen,
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

  // Keep the URL in the language the visitor chose or spoke.
  useEffect(() => {
    if (entry.phase !== 'intro' && entry.phase !== 'hub') return;
    if (entry.lang === locale) return;
    const path = pathname || `/${locale}`;
    const next = path.replace(/^\/(en|ar)(?=\/|$)/, `/${entry.lang}`);
    if (next !== path) router.replace(next);
  }, [entry.lang, entry.phase, locale, pathname, router]);

  useEffect(() => {
    if (entry.phase === 'intro' && haptics && typeof navigator.vibrate === 'function') {
      navigator.vibrate(20);
    }
  }, [entry.phase, haptics]);

  useEffect(() => {
    if (entry.phase === 'hub') markIntroSeen(true);
    if ((entry.phase === 'hub' || entry.phase === 'intro') && entry.line) {
      void speakNarration(entry.line, entry.lang);
    }
  }, [entry.lang, entry.line, entry.phase, markIntroSeen]);

  // The prompt owns the gate until it has finished speaking. Awaiting the line
  // is what keeps "listen1" from cutting the invitation off mid-sentence.
  useEffect(() => {
    if (entry.phase !== 'prompt' && entry.phase !== 'reprompt') return;
    const line = entry.line;
    if (!line) return;
    const done = entry.phase === 'prompt' ? 'prompt_done' : 'reprompt_done';
    let dead = false;
    const safety = window.setTimeout(() => {
      if (!dead) send({ type: done });
    }, narrationSafetyMs(line));
    void speakNarration(line, entry.lang).finally(() => {
      if (!dead) send({ type: done });
    });
    return () => {
      dead = true;
      window.clearTimeout(safety);
    };
  }, [entry.lang, entry.line, entry.phase, send]);

  useEffect(() => {
    if (entry.phase !== 'listen1' && entry.phase !== 'listen2') return;
    if (demo) return;
    let dead = false;
    let heardTimer = 0;
    const startedAt = Date.now();
    let silenceTimer = window.setTimeout(() => {
      if (!dead) send({ type: 'silence' });
    }, 8000);

    const listen = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        send({ type: 'mic_denied' });
        return;
      }
      let stream: MediaStream;
      try {
        // Permission is only ever requested once the prompt has finished.
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        if (!dead) send({ type: 'mic_denied' });
        return;
      }
      if (dead) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      try {
        const record = async (): Promise<Blob | null> => {
          if (typeof MediaRecorder === 'undefined') return null;
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
          if (chunks.length === 0) return null;
          return new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        };

        let clip = await record();
        // One retry when the first 3.5 s clip was only room tone.
        if (!dead && clip && !(await clipHasVoice(clip)) && Date.now() - startedAt < 4500) {
          window.clearTimeout(silenceTimer);
          silenceTimer = window.setTimeout(() => {
            if (!dead) send({ type: 'silence' });
          }, 4000);
          clip = (await record()) ?? clip;
        }
        if (dead || !clip) return;

        const { transcribeClip } = await import('@/modules/voice');
        const result = await transcribeClip(clip, entryRef.current.lang, AbortSignal.timeout(6000));
        const text = result.text.trim();
        if (dead || !text) return;
        setHeard(text);
        heardTimer = window.setTimeout(() => {
          if (!dead) setHeard(null);
        }, 2400);
        // Let the "heard" ring land before the intro takes over.
        await new Promise((resolve) => window.setTimeout(resolve, 900));
        if (!dead) {
          setHeard(null);
          send({ type: 'speech', text, lang: result.language });
        }
      } catch {
        /* A failed clip is not a denied microphone; silence still falls through. */
      } finally {
        stream.getTracks().forEach((track) => track.stop());
      }
    };

    void listen();
    return () => {
      dead = true;
      window.clearTimeout(silenceTimer);
      window.clearTimeout(heardTimer);
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

  const onSound = useCallback(
    (gesture: 'key' | 'pointer') => {
      unlockAudio();
      void getPlayer()
        .init()
        .then(() => getPlayer().earcon('start'))
        .catch(() => undefined);
      send({ type: 'sound', gesture });
    },
    [send],
  );

  const listening = entry.mode === 'audio_first' ? 'listening' : 'visual';
  const promptPhase =
    entry.phase === 'prompt' ||
    entry.phase === 'listen1' ||
    entry.phase === 'reprompt' ||
    entry.phase === 'listen2'
      ? entry.phase
      : null;

  return (
    <div data-testid="entry-state" data-state={entry.phase}>
      {entry.phase === 'pre' ? (
        <PreEntryGate
          locale={locale}
          onSound={onSound}
          onLanguage={(lang) => send({ type: 'language', lang })}
        />
      ) : null}
      {promptPhase ? (
        <ListeningPrompt
          lang={entry.lang}
          phase={promptPhase}
          line={entry.line}
          heard={heard}
          micDenied={entry.line === 'err.mic_denied'}
          onLanguage={(lang) => send({ type: 'language', lang })}
        />
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
      {sting ? <ReturningSting onDone={dismissSting} /> : null}
    </div>
  );
}
