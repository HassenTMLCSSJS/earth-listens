'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { subscribeAnnouncements } from '@/modules/narration';
import { useAppStore } from '@/core/store';

export function CaptionStrip() {
  const t = useTranslations();
  const captions = useAppStore((state) => state.settings.captions);
  const size = useAppStore((state) => state.settings.captionSize);
  const [lines, setLines] = useState<string[]>([]);
  useEffect(
    () =>
      subscribeAnnouncements((item) => {
        const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
        const text = lang === 'ar' ? item.ar : item.en;
        setLines((current) => [...current.slice(-3), text]);
      }),
    [],
  );
  if (!captions) return null;
  const sizeClass = size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-xs' : 'text-sm';
  return (
    <div
      role="log"
      aria-label={t('captions')}
      className={`text-ink/80 border-t border-white/10 px-4 py-3 ${sizeClass}`}
    >
      {lines.map((line, index) => (
        <p key={`${index}-${line}`}>{line}</p>
      ))}
    </div>
  );
}
