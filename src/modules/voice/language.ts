import type { Lang } from '@/core/actions';

/** Prefer the script the person actually spoke, then Whisper's reported language. */
export function resolveHeardLanguage(input: {
  text: string;
  reported?: string | undefined;
  forced: Lang;
}): Lang {
  if (/\p{Script=Arabic}/u.test(input.text)) return 'ar';
  const reported = (input.reported ?? '').toLowerCase();
  if (reported === 'ar' || reported.includes('arab')) return 'ar';
  if (reported === 'en' || reported.includes('eng')) return 'en';
  if (/\p{Script=Latin}/u.test(input.text)) return 'en';
  return input.forced;
}
