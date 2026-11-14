import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export type StatusKind = 'live' | 'real' | 'estimated' | 'sample' | 'cached';

const STYLES: Record<StatusKind, string> = {
  live: 'text-live border-[rgb(74_222_128/.35)] bg-[rgb(74_222_128/.10)]',
  real: 'text-ink-muted border-line-strong',
  estimated: 'text-data border-[rgb(90_209_255/.45)]',
  sample: 'text-on-gold bg-sample border-transparent',
  cached: 'text-ink-muted border-line-strong border-dashed',
};

export function StatusBadge({
  status,
  date,
  className,
}: {
  status: StatusKind;
  date?: string;
  className?: string;
}) {
  const t = useTranslations('badge');
  return (
    <span
      data-status={status}
      className={cn(
        'text-micro inline-flex h-[22px] w-fit items-center gap-1.5 rounded-full border px-2.5 font-semibold whitespace-nowrap',
        STYLES[status],
        className,
      )}
    >
      {status === 'live' ? (
        <span
          aria-hidden="true"
          className="live-dot size-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]"
        />
      ) : null}
      {status === 'cached' ? t('cached', { date: date ?? '' }) : t(status)}
    </span>
  );
}
