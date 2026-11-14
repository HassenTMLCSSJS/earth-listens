/** Hassan picks the closing line. Default stays until he changes it. */
export const INTRO_CLOSING: 'default' | 'alt' = 'default';

export function closingLine(which: 'default' | 'alt' = INTRO_CLOSING): 'intro.l7' | 'intro.l7_alt' {
  return which === 'alt' ? 'intro.l7_alt' : 'intro.l7';
}
