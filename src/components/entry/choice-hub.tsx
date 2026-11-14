'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AudioWaveform, BookOpen, CircleCheckBig, Globe, Music } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { LAYER_IDS } from '@/core/actions';

const OPTIONS = [
  { href: '/listen', title: 'hub.explore', body: 'hub.exploreBody', icon: Globe },
  { href: '/tutorial', title: 'hub.tutorial', body: 'hub.tutorialBody', icon: BookOpen },
  { href: '/how-it-sounds', title: 'hub.sounds', body: 'hub.soundsBody', icon: AudioWaveform },
  { href: '/quiz', title: 'hub.quiz', body: 'hub.quizBody', icon: CircleCheckBig },
] as const;

export function ChoiceHub() {
  const t = useTranslations();
  const locale = useLocale();
  const number = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US');
  const [events, setEvents] = useState(41);

  useEffect(() => {
    let live = true;
    fetch('/api/live/eonet')
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { items?: unknown[] } | null) => {
        if (live && body && Array.isArray(body.items)) setEvents(body.items.length);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  return (
    <section
      data-testid="choice-hub"
      className="mx-auto grid max-w-[1320px] gap-8 px-[clamp(20px,3.4vw,48px)] py-10 lg:grid-cols-[minmax(0,640px)_1fr] lg:items-center"
    >
      <div className="grid gap-7">
        <header className="grid gap-4">
          <span className="v5-eyebrow">{t('hub.eyebrow')}</span>
          <h1 className="display-xl max-w-[16ch]">{t('hub.title')}</h1>
          <p className="v5-lead">{t('hub.lead')}</p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          {OPTIONS.map((option, index) => {
            const Icon = option.icon;
            return (
              <Link
                key={option.href}
                href={option.href}
                // First hub option takes focus when the story ends.
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus={index === 0}
                className="v5-card group relative grid min-h-[190px] content-between gap-6 p-5 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-[rgb(242_196_109/.55)] hover:shadow-[var(--shadow-glow-gold)] focus-visible:-translate-y-1 focus-visible:border-[rgb(242_196_109/.55)]"
              >
                <span className="bg-space-700/80 text-ink-subtle absolute end-4 top-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[0.6875rem] tracking-[0.12em] uppercase">
                  {t('hub.key', { n: index + 1 })}
                </span>
                <Icon className="text-gold size-7" strokeWidth={1.5} aria-hidden="true" />
                <span className="grid gap-2 pe-10">
                  <span className="v5-h3 block">{t(option.title)}</span>
                  <span className="text-ink-muted block text-sm leading-snug">
                    {t(option.body)}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>

        <Link
          href="/symphony"
          className="text-gold inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline"
        >
          <Music className="size-4" strokeWidth={1.75} aria-hidden="true" />
          {t('hub.symphony')}
        </Link>

        <dl className="border-line grid grid-cols-3 gap-4 border-t pt-5">
          {[
            { value: 145, label: 'hub.statYears' },
            { value: LAYER_IDS.length, label: 'hub.statViews' },
            { value: events, label: 'hub.statEvents' },
          ].map((stat) => (
            <div key={stat.label} className="grid gap-1">
              <dt className="sr-only">{t(stat.label)}</dt>
              <dd className="font-display text-ink text-3xl tabular-nums">
                {number.format(stat.value)}
              </dd>
              <dd className="text-ink-subtle text-xs leading-snug">{t(stat.label)}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div aria-hidden="true" className="relative hidden min-h-[420px] lg:block">
        <div className="absolute inset-0 m-auto size-[min(46vw,460px)] rounded-full bg-[radial-gradient(circle,rgb(84_150_255/.28),transparent_68%)] blur-2xl" />
        <div className="absolute inset-0 m-auto size-[min(38vw,380px)] rounded-full bg-[radial-gradient(circle_at_35%_30%,rgb(84_150_255/.55),rgb(11_16_32/.98)_68%)] shadow-[inset_-24px_-18px_60px_rgb(0_0_0/.65),0_0_90px_rgb(84_150_255/.25)]" />
      </div>
    </section>
  );
}
