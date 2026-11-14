'use client';

import { useSyncExternalStore } from 'react';
import { useLocale, useTranslations } from 'next-intl';

function preferredLocale(locale: string): 'en' | 'ar' {
  const list = navigator.languages?.length ? navigator.languages : [navigator.language];
  const arabic = list.some((item) => item.toLowerCase().startsWith('ar'));
  const english = list.some((item) => item.toLowerCase().startsWith('en'));
  if (arabic && !english) return 'ar';
  if (english && !arabic) return 'en';
  return locale === 'ar' ? 'ar' : 'en';
}

export function PreEntryGate({
  onSound,
  onLanguage,
}: {
  onSound: (gesture: 'key' | 'pointer') => void;
  onLanguage: (lang: 'en' | 'ar') => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const preferred = useSyncExternalStore(
    () => () => undefined,
    () => preferredLocale(locale),
    () => (locale === 'ar' ? 'ar' : 'en'),
  );

  const order: Array<'en' | 'ar'> = preferred === 'ar' ? ['ar', 'en'] : ['en', 'ar'];

  return (
    <section className="fixed inset-0 z-40 grid place-items-center overflow-hidden bg-[#05070d]">
      <h1 className="sr-only">Earth Listens</h1>
      <img
        src="/textures/earth-day.jpg"
        alt=""
        width={960}
        height={540}
        className="absolute inset-0 h-full w-full object-cover opacity-70"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,#05070d_78%)]" />
      <button
        type="button"
        // The gate exists so the first keyboard action can start audio.
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        className="absolute inset-0 z-0 cursor-pointer bg-transparent"
        onClick={() => onSound('pointer')}
        onKeyDown={(event) => {
          if (event.key === 'Tab') return;
          event.preventDefault();
          onSound('key');
        }}
      >
        <span className="sr-only">{t('entry.sound')}</span>
      </button>
      <div className="relative z-10 flex gap-4">
        {order.map((lang) => {
          const highlighted = lang === preferred;
          return (
            <button
              key={lang}
              type="button"
              data-preferred={highlighted ? 'true' : 'false'}
              className={`min-h-14 min-w-28 rounded-full border bg-[#05070d] px-6 text-xl ${
                highlighted
                  ? 'border-[#ffd34d] text-[#ffd34d] ring-4 ring-[#ffd34d]/70 motion-safe:animate-pulse'
                  : 'border-white/30 text-[#e8eefc]'
              }`}
              onClick={() => onLanguage(lang)}
            >
              {lang === 'ar' ? 'عربي' : 'English'}
            </button>
          );
        })}
      </div>
    </section>
  );
}
