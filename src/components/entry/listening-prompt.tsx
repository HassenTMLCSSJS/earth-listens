'use client';

import { useTranslations } from 'next-intl';
import type { Lang } from '@/core/actions';
import { narrationText, type NarrationId } from '@/modules/narration';
import type { EntryPhase } from '@/modules/entry';
import { VoiceOrb, type VoiceOrbState } from './voice-orb';

export function ListeningPrompt({
  lang,
  phase,
  line,
  heard,
  micDenied,
  onLanguage,
}: {
  lang: Lang;
  phase: Extract<EntryPhase, 'prompt' | 'listen1' | 'reprompt' | 'listen2'>;
  line: NarrationId | null;
  heard: string | null;
  micDenied: boolean;
  onLanguage: (lang: Lang) => void;
}) {
  const t = useTranslations();
  const speaking = phase === 'prompt' || phase === 'reprompt';
  const listening = phase === 'listen1' || phase === 'listen2';
  const orb: VoiceOrbState = speaking
    ? 'speaking'
    : micDenied
      ? 'idle'
      : heard
        ? 'heard'
        : 'listening';
  const lineText = line ? narrationText(line)[lang] : '';
  const labels: Record<Lang, string> = { en: t('entry.langEn'), ar: t('entry.langAr') };

  return (
    <section
      data-testid="listening-prompt"
      data-state={phase}
      data-lang={lang}
      className="bg-space-950 text-ink fixed inset-0 z-[80] overflow-hidden"
    >
      <div className="stars" aria-hidden="true" />
      <div className="nebula" aria-hidden="true" />
      <h1 className="sr-only">{t('entry.title')}</h1>

      <div className="entry-globe-wrap entry-globe-wrap-mini" aria-hidden="true">
        <div className="entry-globe" />
      </div>

      <div
        className="absolute inset-x-0 z-20 grid justify-items-center gap-7 px-4"
        style={{ top: '52vh' }}
      >
        <VoiceOrb state={orb} micDenied={micDenied} />
        <div role="group" className="flex flex-wrap justify-center gap-3">
          {(['en', 'ar'] as const).map((item) => (
            <button
              key={item}
              type="button"
              lang={item}
              className="entry-lang-sm"
              onClick={() => onLanguage(item)}
            >
              {labels[item]}
            </button>
          ))}
        </div>
      </div>

      <div
        role="log"
        aria-live="polite"
        className="entry-caption border-line bg-glass border backdrop-blur-md"
      >
        <p className="text-ink-subtle text-micro font-mono tracking-[0.14em] uppercase">
          {t('agent.guide')}
        </p>
        <div className="mt-1 grid gap-1">
          {heard ? <p className="text-gold-hi">{t('prompt.heard', { text: heard })}</p> : null}
          {lineText ? <p>{lineText}</p> : null}
          {listening && !lineText ? (
            <p className="flex flex-wrap items-center justify-center gap-2">
              <span>{t('prompt.listening')}</span>
              <kbd className="entry-kbd">{t('prompt.keyHint')}</kbd>
              <span>{t('prompt.sayHint')}</span>
            </p>
          ) : null}
          {micDenied ? <p className="text-ink-muted">{t('prompt.micOff')}</p> : null}
        </div>
      </div>
    </section>
  );
}
