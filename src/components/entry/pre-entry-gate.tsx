'use client';

import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';

export function preferredLocale(locale: string): 'en' | 'ar' {
  const list = navigator.languages?.length ? navigator.languages : [navigator.language];
  const arabic = list.some((item) => item.toLowerCase().startsWith('ar'));
  const english = list.some((item) => item.toLowerCase().startsWith('en'));
  if (arabic && !english) return 'ar';
  if (english && !arabic) return 'en';
  return locale === 'ar' ? 'ar' : 'en';
}

/**
 * The first screen is deliberately textless apart from the two language
 * buttons. Everything else is a full-screen sound target so the very first
 * click, Space or Enter can unlock audio.
 */
export function PreEntryGate({
  locale,
  onSound,
  onLanguage,
}: {
  locale: 'en' | 'ar';
  onSound: (gesture: 'key' | 'pointer') => void;
  onLanguage: (lang: 'en' | 'ar') => void;
}) {
  const t = useTranslations();
  const preferred = useSyncExternalStore(
    () => () => undefined,
    () => preferredLocale(locale),
    () => (locale === 'ar' ? 'ar' : 'en'),
  );

  const order: Array<'en' | 'ar'> = preferred === 'ar' ? ['ar', 'en'] : ['en', 'ar'];
  const labels: Record<'en' | 'ar', string> = {
    en: t('entry.langEn'),
    ar: t('entry.langAr'),
  };

  return (
    <section
      data-testid="pre-entry-gate"
      className="bg-space-950 text-ink fixed inset-0 z-[80] overflow-hidden"
    >
      <div className="stars" aria-hidden="true" />
      <div className="nebula" aria-hidden="true" />
      <div className="entry-grain" aria-hidden="true" />
      <h1 className="sr-only">{t('entry.title')}</h1>

      <div className="entry-globe-wrap" aria-hidden="true">
        <div className="entry-globe" />
      </div>

      <div className="entry-langs absolute inset-x-0 z-20 flex justify-center px-4">
        <div role="group" className="flex flex-wrap justify-center gap-4">
          {order.map((lang) => {
            const suggested = lang === preferred;
            return (
              <button
                key={lang}
                type="button"
                lang={lang}
                data-preferred={suggested ? 'true' : 'false'}
                aria-describedby={suggested ? 'entry-suggested' : undefined}
                className={`entry-lang ${suggested ? 'entry-lang-suggested' : ''}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onLanguage(lang);
                }}
              >
                {labels[lang]}
              </button>
            );
          })}
        </div>
        <span id="entry-suggested" className="sr-only">
          {t('entry.suggested')}
        </span>
      </div>

      <button
        type="button"
        // The gate exists so the first keyboard action can start audio.
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        aria-label={t('entry.sound')}
        className="gate-hit"
        onClick={(event) => onSound(event.detail === 0 ? 'key' : 'pointer')}
      >
        <span className="sr-only">{t('entry.sound')}</span>
      </button>

      <div className="entry-hp" aria-hidden="true">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1v-6h3v4ZM3 19a2 2 0 0 0 2 2h1v-6H3v4Z" />
        </svg>
        <span className="entry-gold-dot" />
      </div>

      <noscript>
        <div className="border-line-strong bg-space-900 text-ink absolute inset-x-4 bottom-24 z-30 mx-auto max-w-xl rounded-2xl border p-4 text-center">
          <p>{t('entry.noscript')}</p>
          <p className="mt-3 flex justify-center gap-4">
            {/* Plain links on purpose: this block only exists when JS is off. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className="underline" href="/en/listen">
              English
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className="underline" href="/ar/listen" lang="ar">
              عربي
            </a>
          </p>
        </div>
      </noscript>
    </section>
  );
}
