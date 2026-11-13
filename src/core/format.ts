import type { Lang } from '@/core/actions';

const LOCALE: Record<Lang, string> = { en: 'en-US', ar: 'ar-EG' };

export function formatNumber(
  value: number,
  lang: Lang,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(LOCALE[lang], options).format(value);
}

export function formatYear(year: number, lang: Lang): string {
  return formatNumber(year, lang, { maximumFractionDigits: 0, useGrouping: false });
}

export function formatDegrees(value: number, lang: Lang): string {
  const sign =
    value > 0
      ? lang === 'ar'
        ? 'زائد '
        : 'plus '
      : value < 0
        ? lang === 'ar'
          ? 'ناقص '
          : 'minus '
        : '';
  const abs = formatNumber(Math.abs(value), lang, { maximumFractionDigits: 2 });
  return `${sign}${abs}`;
}

const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const MONTHS_AR = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
] as const;

export function formatIsoDate(iso: string, lang: Lang): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const monthName = lang === 'ar' ? MONTHS_AR[month - 1] : MONTHS_EN[month - 1];
  if (!monthName) return iso;
  return lang === 'ar'
    ? `${formatNumber(day, 'ar', { maximumFractionDigits: 0, useGrouping: false })} ${monthName} ${formatYear(year, 'ar')}`
    : `${day} ${monthName} ${year}`;
}
