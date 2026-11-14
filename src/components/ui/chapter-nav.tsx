'use client';

import { useTranslations } from 'next-intl';

export function ChapterNav({
  count,
  current,
  onSelect,
}: {
  count: number;
  current: number;
  onSelect: (index: number) => void;
}) {
  const t = useTranslations('story');
  return (
    <nav aria-label={t('nav')} className="flex flex-wrap gap-2">
      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          type="button"
          aria-current={index === current ? 'true' : undefined}
          className={`min-h-11 min-w-11 rounded-full border px-3 ${index === current ? 'border-data bg-data text-space-950' : 'border-white/20'}`}
          onClick={() => onSelect(index)}
        >
          {index + 1}
        </button>
      ))}
    </nav>
  );
}
