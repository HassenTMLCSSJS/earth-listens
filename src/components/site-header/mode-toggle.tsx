'use client';

import { useTranslations } from 'next-intl';
import { Ear, Eye } from 'lucide-react';
import { useAppStore } from '@/core/store';
import { cn } from '@/lib/utils';

export function ModeToggle({
  showLabel = true,
  className,
}: {
  showLabel?: boolean;
  className?: string;
}) {
  const t = useTranslations('header');
  const mode = useAppStore((state) => state.mode);
  const dispatch = useAppStore((state) => state.dispatch);
  const listening = mode === 'audio_first';
  const Icon = listening ? Ear : Eye;
  return (
    <button
      type="button"
      aria-pressed={listening}
      aria-label={`${t('mode')}: ${listening ? t('modeListeningOn') : t('modeVisualOn')}`}
      title={listening ? t('modeListeningOn') : t('modeVisualOn')}
      onClick={() => {
        dispatch({ type: 'set_mode', mode: listening ? 'visual' : 'audio_first' }, 'pointer');
      }}
      className={cn(
        'text-ink-muted hover:bg-space-700 hover:text-ink inline-flex h-11 items-center gap-2 rounded-full border border-transparent px-3 text-sm font-medium transition-colors',
        'aria-pressed:text-gold',
        className,
      )}
    >
      <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
      {showLabel ? <span>{listening ? t('audio') : t('visual')}</span> : null}
    </button>
  );
}
