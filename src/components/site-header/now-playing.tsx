'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAppStore } from '@/core/store';
import { cn } from '@/lib/utils';

/** The gold "now playing" chip. Only mounted while sound is playing. */
export function NowPlaying({ className }: { className?: string }) {
  const t = useTranslations();
  const status = useAppStore((state) => state.playback.status);
  const layers = useAppStore((state) => state.layers);
  if (status !== 'playing' || layers.length === 0) return null;
  const extra = layers.length - 1;
  return (
    <Link
      href="/listen"
      role="note"
      className={cn(
        'text-gold inline-flex h-9 items-center gap-2 rounded-full border border-[rgb(242_196_109/.35)] bg-[rgb(242_196_109/.10)] px-3 text-[0.8125rem] font-semibold',
        className,
      )}
    >
      <span className="now-bars" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="sr-only">{t('header.nowPlaying')}: </span>
      <span className="max-w-[9ch] truncate">{t(`layers.${layers[0] ?? 'temperature'}`)}</span>
      {extra > 0 ? <span aria-hidden="true">+{extra}</span> : null}
    </Link>
  );
}
