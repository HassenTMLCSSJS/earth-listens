'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { isDemoFlag } from '@/core/demo';
import { useAppStore } from '@/core/store';
import { useContent } from '@/core/catalog';
import { subscribe } from '@/core/bus';
import { isTypingTarget, SHORTCUTS } from '@/modules/a11y';
import { announce } from '@/modules/narration';
import { getPlayer, unlockAudio } from '@/modules/sonification';
import { Banner } from '@/components/ui/banner';
import { CaptionStrip } from '@/components/ui/caption-strip';
import { KeyHint } from '@/components/ui/key-hint';
import { LiveRegion } from '@/components/ui/live-region';
import { CommandBox } from '@/components/command-box';
import { PlaybackBridge } from '@/components/playback-bridge';
import { QuizPanel } from '@/components/quiz-panel';
import { TalkButton } from '@/components/talk-button';
import { Toaster } from '@/components/ui/sonner';
import { SpaceBackdrop } from '@/components/backgrounds/space-backdrop';
import { SiteHeader } from '@/components/site-header/site-header';
import { SiteFooter } from '@/components/site-footer';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

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

export function Shell({ children, locale }: { children: ReactNode; locale: string }) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppStore((state) => state.dispatch);
  const sample = useAppStore((state) => state.sample);
  const frameSample = useAppStore((state) =>
    state.layers.some((id) => {
      const layer = state.catalog[id];
      return (
        layer !== undefined &&
        !layer.isSample &&
        layer.data.frames.some((frame) => frame.sample === true)
      );
    }),
  );
  const demo = useAppStore((state) => state.demo);
  const hub = useAppStore((state) => state.hub);
  const quiz = useAppStore((state) => state.quiz);
  const settings = useAppStore((state) => state.settings);
  const load = useContent((state) => state.load);
  const [help, setHelp] = useState(false);
  const [online, setOnline] = useState(true);

  // The route is the source of truth for the language, so a direct link to
  // /ar/... reads and speaks Arabic immediately.
  useEffect(() => {
    if (useAppStore.getState().lang !== locale)
      useAppStore.setState({ lang: locale as 'ar' | 'en' });
  }, [locale]);

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
    // The catalog has to be ready for the first command, including the offline demo.
    void load();
    // Voice and Tone wait for idle or the first gesture so Listen and Tutorial
    // are not blocked on the speech and synthesis chunks. Demo mode cannot wait
    // for idle: the Arabic listen page keeps the main thread busy with the globe
    // and Arabic text, so requestIdleCallback does not run until its 4s timeout.
    // That is after the network has gone quiet, and going offline then fails the
    // Tone worker (turbopack-worker-*.js and the tone chunk).
    let warmed = false;
    const warm = () => {
      if (warmed) return;
      warmed = true;
      void import('@/modules/voice');
      if (demoOn && typeof Worker !== 'undefined') void warmTone();
    };
    if (demoOn) {
      warm();
    } else {
      const schedule = () => {
        if (typeof window.requestIdleCallback === 'function') {
          window.requestIdleCallback(() => warm(), { timeout: 4000 });
        } else window.setTimeout(warm, 1);
      };
      if (document.readyState === 'complete') schedule();
      else window.addEventListener('load', schedule, { once: true });
      window.addEventListener('pointerdown', warm, { once: true });
      window.addEventListener('keydown', warm, { once: true });
    }
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, [load]);

  useEffect(() => {
    const unlisten = subscribe('navigate', (action) => {
      if (action.type !== 'navigate') return;
      router.push(action.href);
    });
    const unlang = subscribe('set_language', (action) => {
      if (action.type !== 'set_language' || action.lang === locale) return;
      const query = window.location.search.replace(/^\?/, '');
      router.replace(query ? `${pathname}?${query}` : pathname, { locale: action.lang });
    });
    return () => {
      unlisten();
      unlang();
    };
  }, [locale, pathname, router]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

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
        const guideSearch = document.getElementById('guide-search');
        if (guideSearch instanceof HTMLElement) guideSearch.focus();
        else document.getElementById('command')?.focus();
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
  const onEntry = pathname === '/';
  const showChrome = !onEntry || hub || demo;
  const showFooter = showChrome && pathname !== '/listen';

  return (
    <>
      <a className="skip-link" href="#content">
        {t('skip')}
      </a>
      <SpaceBackdrop threads={showChrome && pathname !== '/listen'} />
      <LiveRegion />
      <PlaybackBridge />
      {showChrome ? <SiteHeader /> : null}
      <main
        id="content"
        key={pathname}
        className={
          showChrome ? 'route-fade relative z-10 scroll-mt-28 pt-24 pb-[8.5rem]' : 'relative z-10'
        }
      >
        {showChrome ? (
          <div className="relative z-30">
            <Banner sample={sample} demo={demo} frameSample={frameSample} />
            {!online ? (
              <p
                role="status"
                className="border-line bg-glass text-ink-muted mx-auto mt-2 w-fit rounded-full border px-4 py-1.5 text-sm backdrop-blur"
              >
                {t('header.offline')}
              </p>
            ) : null}
          </div>
        ) : null}
        {children}
        {quiz?.open && !onQuiz ? <QuizPanel /> : null}
      </main>
      {showFooter ? <SiteFooter /> : null}
      {showChrome ? (
        <div
          data-testid="command-dock"
          className="border-line bg-glass fixed end-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 flex w-[min(440px,calc(100vw-2rem))] items-center gap-2 rounded-full border p-2 shadow-[var(--shadow-float)] backdrop-blur-[18px]"
        >
          <TalkButton />
          <CommandBox />
        </div>
      ) : null}
      {showChrome ? <CaptionStrip /> : null}
      <Toaster position="top-center" />
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="panel max-w-lg p-6">
          <DialogTitle className="font-display text-2xl">{t('help.title')}</DialogTitle>
          <DialogDescription className="sr-only">{t('help.title')}</DialogDescription>
          <div className="mt-4 grid gap-3">
            {SHORTCUTS.map((item) => (
              <KeyHint key={item.id} keys={item.keys} label={locale === 'ar' ? item.ar : item.en} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
