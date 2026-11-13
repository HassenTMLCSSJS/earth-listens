import type { Lang } from '@/core/actions';
import type { FeedEnvelope, FreshnessStatus } from './schemas';

const CAIRO = 'Africa/Cairo';

export function cairoParts(iso: string, lang: Lang): { date: string; time: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { date: iso, time: '' };
  const locale = lang === 'ar' ? 'ar-EG' : 'en-GB';
  return {
    date: new Intl.DateTimeFormat(locale, {
      timeZone: CAIRO,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date),
    time: new Intl.DateTimeFormat(locale, {
      timeZone: CAIRO,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(date),
  };
}

export function describeFreshness(
  envelope: Pick<FeedEnvelope, 'status' | 'dataTime' | 'fetchedAt'>,
  lang: Lang,
): string {
  const data = cairoParts(envelope.dataTime, lang);
  const updated = cairoParts(envelope.fetchedAt, lang);
  if (envelope.status === 'demo') return lang === 'ar' ? 'بيانات تجريبية' : 'Demo data';
  if (envelope.status === 'snapshot') {
    return lang === 'ar' ? `لقطة محفوظة من ${data.date}` : `Cached snapshot from ${data.date}`;
  }
  if (envelope.status === 'recent') {
    return lang === 'ar' ? `حديث (≤ 48 ساعة) · ${data.date}` : `Recent (≤ 48 h) · ${data.date}`;
  }
  return lang === 'ar'
    ? `مباشر · بيانات ${data.date} · محدّث ${updated.time} بتوقيت القاهرة`
    : `Live · data ${data.date} · updated ${updated.time} Cairo time`;
}

export function statusForAge(ageMs: number, revalidateMs: number): FreshnessStatus {
  if (ageMs <= revalidateMs) return 'live';
  if (ageMs <= 48 * 60 * 60 * 1000) return 'recent';
  return 'snapshot';
}

export const NIGHT_BRIGHTNESS_LABEL =
  'night brightness index (image-derived, not calibrated radiance)';
