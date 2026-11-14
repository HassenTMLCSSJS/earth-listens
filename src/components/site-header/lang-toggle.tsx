'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useAppStore } from '@/core/store';
import { cn } from '@/lib/utils';

/**
 * Segmented EN | عربي. It dispatches `set_language`; the shell keeps the
 * current path and query and swaps the locale for us.
 */
export function LangToggle({ full = false, className }: { full?: boolean; className?: string }) {
  const t = useTranslations('settings');
  const locale = useLocale() === 'ar' ? 'ar' : 'en';
  const dispatch = useAppStore((state) => state.dispatch);
  const choose = (next: string) => {
    if (next !== 'en' && next !== 'ar') return;
    if (next === locale) return;
    dispatch({ type: 'set_language', lang: next }, 'pointer');
  };
  const width = full ? 'w-[5.75rem]' : 'w-[3.5rem]';
  const base =
    'inline-flex h-9 items-center justify-center rounded-full px-0 text-center text-sm leading-none transition-colors';
  return (
    <div
      role="group"
      aria-label={t('language')}
      className={cn(
        'border-line inline-flex items-center gap-0.5 rounded-full border bg-white/[0.03] p-[3px]',
        className,
      )}
    >
      <button
        type="button"
        lang="en"
        aria-pressed={locale === 'en'}
        title="English"
        onClick={() => choose('en')}
        className={cn(
          base,
          width,
          'aria-pressed:bg-ink aria-pressed:text-space-950 text-ink-subtle hover:text-ink font-semibold',
        )}
      >
        {full ? 'English' : 'EN'}
      </button>
      <button
        type="button"
        lang="ar"
        aria-pressed={locale === 'ar'}
        title="عربي"
        onClick={() => choose('ar')}
        className={cn(
          base,
          width,
          'font-ar-display aria-pressed:bg-ink aria-pressed:text-space-950 text-ink-subtle hover:text-ink text-[0.9375rem] font-medium',
        )}
      >
        عربي
      </button>
    </div>
  );
}
