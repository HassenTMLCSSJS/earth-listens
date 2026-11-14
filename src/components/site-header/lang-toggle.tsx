'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useAppStore } from '@/core/store';
import { cn } from '@/lib/utils';

/**
 * Segmented EN | ع. It dispatches `set_language`; the shell keeps the current
 * path and query and swaps the locale for us.
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
        onClick={() => choose('en')}
        className="aria-pressed:bg-ink aria-pressed:text-space-950 text-ink-subtle hover:text-ink inline-flex h-9 min-w-10 items-center justify-center rounded-full px-2.5 text-sm font-semibold transition-colors"
      >
        {full ? 'English' : 'EN'}
      </button>
      <button
        type="button"
        lang="ar"
        aria-pressed={locale === 'ar'}
        onClick={() => choose('ar')}
        className="font-ar-display aria-pressed:bg-ink aria-pressed:text-space-950 text-ink-subtle hover:text-ink inline-flex h-9 min-w-10 items-center justify-center rounded-full px-2.5 text-sm font-medium transition-colors"
      >
        {full ? 'عربي' : 'ع'}
      </button>
    </div>
  );
}
