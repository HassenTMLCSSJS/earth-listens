'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { subscribeAnnouncements } from '@/modules/narration';
import { useAppStore } from '@/core/store';
import { cn } from '@/lib/utils';

/** One latest narration line, cleared shortly after it finishes. */
const CLEAR_AFTER_MS = 5000;

export function CaptionStrip() {
  const t = useTranslations();
  const captions = useAppStore((state) => state.settings.captions);
  const size = useAppStore((state) => state.settings.captionSize);
  const [line, setLine] = useState('');
  const clearTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = subscribeAnnouncements((item) => {
      const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
      const text = lang === 'ar' ? item.ar : item.en;
      if (!text) return;
      clearTimeout(clearTimer.current);
      setLine(text);
      clearTimer.current = setTimeout(() => setLine(''), CLEAR_AFTER_MS);
    });
    return () => {
      unsubscribe();
      clearTimeout(clearTimer.current);
    };
  }, []);

  if (!captions || !line) return null;
  const sizeClass = size === 'lg' ? 'text-base' : size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div
      data-testid="caption-bar"
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-[720px] justify-center"
    >
      <p
        aria-label={t('captions')}
        className={cn(
          'border-line bg-glass text-ink line-clamp-2 rounded-[var(--radius-card)] border px-5 py-2.5 text-center shadow-[var(--shadow-float)] backdrop-blur-[18px]',
          sizeClass,
        )}
      >
        {line}
      </p>
    </div>
  );
}
