import { describe, expect, it } from 'vitest';
import { parseIntent } from './parser';

const ctx = { layers: ['temperature' as const], region: 'global' as const };

describe('parseIntent', () => {
  const cases: [string, unknown][] = [
    ['play temperature', [{ type: 'select_phenomenon', id: 'temperature' }, { type: 'play' }]],
    ['play forest', [{ type: 'select_phenomenon', id: 'forest' }, { type: 'play' }]],
    ['play rain', [{ type: 'select_phenomenon', id: 'precipitation' }, { type: 'play' }]],
    ['شغّل الأحداث', [{ type: 'select_phenomenon', id: 'events' }, { type: 'play' }]],
    [
      'شغّل الحرايق في أفريقيا',
      [
        { type: 'select_phenomenon', id: 'wildfire' },
        { type: 'set_region', region: 'africa' },
        { type: 'play' },
      ],
    ],
    ['روح لمصر', [{ type: 'set_region', region: 'egypt' }]],
    ['روح لسنة ١٩٩٠', [{ type: 'set_time', from: 1990 }]],
    ['go to 1990', [{ type: 'set_time', from: 1990 }]],
    ['قارن ١٩٠٠ و٢٠٢٠', [{ type: 'compare_times', a: 1900, b: 2020 }, { type: 'play' }]],
    ['play from 1950 to 2000', [{ type: 'set_time', from: 1950, to: 2000 }, { type: 'play' }]],
    ['ضيف الجليد', [{ type: 'combine_layers', ids: ['temperature', 'sea_ice'] }]],
    [
      'شغّل السيمفونية',
      [
        { type: 'combine_layers', ids: ['temperature', 'wildfire', 'sea_ice', 'co2'] },
        { type: 'play' },
      ],
    ],
    ['slower', [{ type: 'play', speed: 'slow' }]],
    ['وقّف', [{ type: 'stop' }]],
    ['بس', [{ type: 'stop' }]],
    ['أنا بسمع إيه؟', [{ type: 'explain_mapping', id: 'current', level: 'short' }]],
    ['اختبرني', [{ type: 'start_quiz' }]],
    ['وضع الصوت', [{ type: 'set_mode', mode: 'audio_first' }]],
    ['كلمني بالعربي', [{ type: 'set_language', lang: 'ar' }]],
    ['help', [{ type: 'help' }]],
    ['تخطّي', [{ type: 'skip' }]],
  ];

  it.each(cases)('%s', (input, actions) => {
    const result = parseIntent(input, ctx);
    expect(result.matched).toBe(true);
    expect(result.actions).toEqual(actions);
  });

  it('rejects unknown speech', () => {
    const result = parseIntent('zzz random', ctx);
    expect(result.matched).toBe(false);
    expect(result.actions).toEqual([]);
  });
});
