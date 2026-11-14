'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

const OPTIONS: {
  href: '/listen' | '/tutorial' | '/how-it-sounds' | '/quiz';
  key: 'hub.explore' | 'hub.tutorial' | 'hub.sounds' | 'hub.quiz';
}[] = [
  { href: '/listen', key: 'hub.explore' },
  { href: '/tutorial', key: 'hub.tutorial' },
  { href: '/how-it-sounds', key: 'hub.sounds' },
  { href: '/quiz', key: 'hub.quiz' },
];

export function ChoiceHub() {
  const t = useTranslations();

  return (
    <section data-testid="choice-hub" className="mx-auto grid max-w-3xl gap-4 px-4 py-16">
      <h1 className="display text-5xl">{t('hub.title')}</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((option, index) => (
          <Link
            key={option.href}
            href={option.href}
            // First hub option takes focus when the story ends.
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus={index === 0}
            className="panel flex min-h-24 items-center gap-3 p-5 text-xl"
          >
            <span className="text-[#ffd34d]">{index + 1}</span>
            {t(option.key)}
          </Link>
        ))}
      </div>
      <Link href="/symphony" className="min-h-11 text-sm underline">
        {t('hub.symphony')}
      </Link>
    </section>
  );
}
