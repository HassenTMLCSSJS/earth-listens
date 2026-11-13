'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { isDemoFlag } from '@/core/demo';
import { useAppStore } from '@/core/store';
import { useContent } from '@/core/catalog';
import { isTypingTarget, SHORTCUTS } from '@/modules/a11y';
import { announce } from '@/modules/narration';
import { getPlayer, unlockAudio } from '@/modules/sonification';
import { Banner } from '@/components/ui/banner';
import { CaptionStrip } from '@/components/ui/caption-strip';
import { IconButton } from '@/components/ui/icon-button';
import { KeyHint } from '@/components/ui/key-hint';
import { LiveRegion } from '@/components/ui/live-region';
import { CommandBox } from '@/components/command-box';
import { PlaybackBridge } from '@/components/playback-bridge';
import { QuizPanel } from '@/components/quiz-panel';
import * as Dialog from '@radix-ui/react-dialog';

function warmTone(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const worker = new Worker(new URL('../workers/warm-tone.ts', import.meta.url), {
        type: 'module',
      });
      const finish = () => {
        worker.terminate();
        resolve();
      };
      worker.onmessage = finish;
      worker.onerror = finish;
    } catch {
      resolve();
    }
  });
}

const LINKS = [
  ['/', 'nav.home'],
  ['/listen', 'nav.listen'],
  ['/quiz', 'nav.quiz'],
  ['/tutorial', 'nav.tutorial'],
  ['/how-it-sounds', 'nav.sounds'],
  ['/guide', 'nav.guide'],
  ['/data', 'nav.data'],
  ['/settings', 'nav.settings'],
] as const;

export function Shell({ children, locale }: { children: ReactNode; locale: string }) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppStore((state) => state.dispatch);
  const mode = useAppStore((state) => state.mode);
  const sample = useAppStore((state) => state.sample);
  const demo = useAppStore((state) => state.demo);
  const quiz = useAppStore((state) => state.quiz);
  const settings = useAppStore((state) => state.settings);
  const load = useContent((state) => state.load);
  const [help, setHelp] = useState(false);
  const other = locale === 'ar' ? 'en' : 'ar';

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const demoOn = isDemoFlag(search.get('demo')) || document.cookie.includes('el.demo=1');
    useAppStore.getState().setDemo(demoOn, search.get('debug') === '1');
    document.documentElement.dataset.demo = demoOn ? '1' : '0';
    const saved = localStorage.getItem('el.settings.v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<typeof settings>;
        if (parsed && typeof parsed === 'object') {
          useAppStore.setState({ settings: { ...useAppStore.getState().settings, ...parsed } });
        }
      } catch {
        /* Ignore a damaged settings blob. */
      }
    }
    const storedMode = localStorage.getItem('el.mode');
    if (storedMode === 'audio_first' || storedMode === 'visual')
      useAppStore.setState({ mode: storedMode });
    if (!demoOn && localStorage.getItem('el.introSeen') === '1')
      useAppStore.getState().markIntroSeen(true);
    // Voice stays in the cache so narration works after the demo goes offline.
    // Tone is warmed in a worker only for ?demo=1, off the main thread.
    const jobs: Promise<unknown>[] = [load(), import('@/modules/voice')];
    if (demoOn && typeof Worker !== 'undefined') {
      jobs.push(warmTone());
    }
    void Promise.all(jobs);
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, [load]);

  const skipFocus = useRef(true);
  useEffect(() => {
    if (skipFocus.current) {
      skipFocus.current = false;
      return;
    }
    const heading = document.querySelector('#content h1');
    if (!(heading instanceof HTMLElement)) return;
    heading.tabIndex = -1;
    heading.focus();
  }, [pathname]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      const reduce =
        settings.reducedMotion === 'on' || (settings.reducedMotion === 'system' && media.matches);
      document.documentElement.dataset.motion = reduce ? 'reduce' : 'full';
      document.documentElement.dataset.gsapDisabled = reduce ? 'true' : 'false';
      document.documentElement.dataset.contrast = settings.highContrast ? 'high' : 'normal';
      document.documentElement.dataset.sr = settings.screenReaderMode ? '1' : '0';
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [settings]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey && event.code === 'KeyT') {
        event.preventDefault();
        unlockAudio();
        document.getElementById('command')?.focus();
        announce({ en: 'Listening.', ar: 'بسمعك.' });
        getPlayer().earcon('listening');
        return;
      }
      if (event.altKey && event.shiftKey && event.code === 'KeyS') {
        event.preventDefault();
        getPlayer().stop();
        dispatch({ type: 'stop' }, 'keyboard');
        return;
      }
      if (event.key === 'Escape') {
        setHelp(false);
        dispatch({ type: 'skip' }, 'keyboard');
        return;
      }
      if (isTypingTarget(event.target)) return;
      if (event.key === '?') {
        event.preventDefault();
        setHelp(true);
      } else if (event.key === '/') {
        event.preventDefault();
        document.getElementById('command')?.focus();
      } else if (
        (pathname.includes('/quiz') || useAppStore.getState().quiz?.open) &&
        (event.key === '1' || event.key === '2' || event.key === '3')
      ) {
        const answer =
          event.key === '1' ? 'increased' : event.key === '2' ? 'decreased' : 'unchanged';
        dispatch({ type: 'quiz_answer', answer }, 'keyboard');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, pathname]);

  const onQuiz = pathname.endsWith('/quiz');

  return (
    <>
      <a className="skip-link" href="#content">
        {t('skip')}
      </a>
      <LiveRegion />
      <PlaybackBridge />
      <header className="bg-space-950/90 sticky top-0 z-30 border-b border-white/10 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <p className="font-semibold">{t('meta.title')}</p>
          <nav aria-label={t('nav.label')} className="flex flex-wrap gap-2">
            {LINKS.map(([href, key]) => (
              <Link
                key={href}
                href={href}
                prefetch={false}
                className="inline-flex min-h-11 items-center px-2"
              >
                {t(key)}
              </Link>
            ))}
          </nav>
          <IconButton
            aria-label={t('header.talk')}
            onClick={() => document.getElementById('command')?.focus()}
          >
            {t('header.talk')}
          </IconButton>
          <IconButton
            aria-label={t('header.stop')}
            onClick={() => {
              getPlayer().stop();
              dispatch({ type: 'stop' }, 'pointer');
            }}
          >
            {t('header.stop')}
          </IconButton>
          <IconButton
            aria-pressed={mode === 'audio_first'}
            aria-label={mode === 'audio_first' ? t('header.visual') : t('header.audio')}
            onClick={() =>
              dispatch(
                { type: 'set_mode', mode: mode === 'audio_first' ? 'visual' : 'audio_first' },
                'pointer',
              )
            }
          >
            {mode === 'audio_first' ? t('header.visual') : t('header.audio')}
          </IconButton>
          <IconButton
            data-testid="pause-animations"
            aria-pressed={settings.reducedMotion === 'on'}
            aria-label={settings.reducedMotion === 'on' ? t('header.resume') : t('header.pause')}
            onClick={() =>
              dispatch(
                {
                  type: 'set_setting',
                  key: 'reducedMotion',
                  value: settings.reducedMotion === 'on' ? 'off' : 'on',
                },
                'pointer',
              )
            }
          >
            {settings.reducedMotion === 'on' ? t('header.resume') : t('header.pause')}
          </IconButton>
          <IconButton aria-label={t('header.help')} onClick={() => setHelp(true)}>
            {t('header.help')}
          </IconButton>
          <button
            type="button"
            className="min-h-11 px-3"
            onClick={() => {
              dispatch({ type: 'set_language', lang: other }, 'pointer');
              const query = window.location.search.replace(/^\?/, '');
              router.replace(query ? `${pathname}?${query}` : pathname, { locale: other });
            }}
          >
            {t('header.language')}
          </button>
        </div>
        <div className="px-4 pb-3">
          <CommandBox />
        </div>
      </header>
      <Banner sample={sample} demo={demo} />
      <main id="content" key={pathname} className="route-fade">
        {children}
        {quiz?.open && !onQuiz ? <QuizPanel /> : null}
      </main>
      <CaptionStrip />
      <footer className="grid gap-2 px-4 py-8 text-sm">
        <p>{t('footer.credit')}</p>
        <p lang="en">{t('banner.nasa')}</p>
        <p>{t('footer.license')}</p>
        <button
          type="button"
          className="min-h-11 w-fit rounded-full border border-white/20 px-4"
          onClick={() => {
            useAppStore.getState().markIntroSeen(false);
            router.push('/');
          }}
        >
          {t('intro.replay')}
        </button>
      </footer>
      <Dialog.Root open={help} onOpenChange={setHelp}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60" />
          <Dialog.Content
            className="panel fixed inset-x-4 top-16 z-50 mx-auto max-w-lg p-6"
            aria-describedby={undefined}
          >
            <Dialog.Title className="text-2xl">{t('help.title')}</Dialog.Title>
            <div className="mt-4 grid gap-3">
              {SHORTCUTS.map((item) => (
                <KeyHint
                  key={item.id}
                  keys={item.keys}
                  label={locale === 'ar' ? item.ar : item.en}
                />
              ))}
            </div>
            <Dialog.Close className="mt-6 min-h-11 rounded-full border border-white/20 px-4">
              {t('help.close')}
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
