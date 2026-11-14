import { describe, expect, it } from 'vitest';
import { resolveHeardLanguage } from './language';

describe('heard language', () => {
  it('follows Arabic script even when the hint was English', () => {
    expect(resolveHeardLanguage({ text: 'شغّل الحرارة', reported: 'english', forced: 'en' })).toBe(
      'ar',
    );
    expect(
      resolveHeardLanguage({ text: 'play temperature', reported: 'french', forced: 'ar' }),
    ).toBe('en');
    expect(resolveHeardLanguage({ text: '', reported: 'arabic', forced: 'en' })).toBe('ar');
    expect(resolveHeardLanguage({ text: '...', reported: 'en', forced: 'ar' })).toBe('en');
    expect(resolveHeardLanguage({ text: '...', forced: 'ar' })).toBe('ar');
  });
});
