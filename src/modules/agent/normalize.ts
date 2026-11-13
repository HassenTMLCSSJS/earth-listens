/** Shared utterance normalizer for Arabic and English commands. */
export function normalizeUtterance(text: string): string {
  let value = text.toLowerCase();
  value = value.replace(/[\u064b-\u0652\u0640]/g, '');
  value = value.replace(/[أإآٱ]/g, 'ا');
  value = value.replace(/ى/g, 'ي');
  value = value.replace(/ة/g, 'ه');
  value = value.replace(/ئ/g, 'ي');
  value = value.replace(/ؤ/g, 'و');
  value = value.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
  value = value.replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
  value = value.replace(/[^\p{L}\p{N}\s]/gu, ' ');
  return value.replace(/\s+/g, ' ').trim();
}

const PREFIX = /^(?:و|ف|ب|ل|ك)?(?:ال)?(.+)$/u;

export function tokenMatches(token: string, word: string): boolean {
  if (token === word) return true;
  const match = PREFIX.exec(token);
  return match?.[1] === word && match[1] !== token;
}

export function tokensOf(normalized: string): string[] {
  return normalized.split(' ').filter((token) => token.length > 0);
}

export function hasToken(tokens: readonly string[], words: readonly string[]): boolean {
  return words.some((word) => {
    if (word.includes(' ')) return false;
    return tokens.some((token) => tokenMatches(token, word));
  });
}

export function hasPhrase(normalized: string, phrases: readonly string[]): boolean {
  return phrases.some((phrase) => {
    if (phrase.includes(' ')) return normalized.includes(phrase);
    const tokens = tokensOf(normalized);
    return hasToken(tokens, [phrase]);
  });
}

export function consumePhrases(normalized: string, phrases: readonly string[]): string {
  let scratch = ` ${normalized} `;
  const ordered = phrases.slice().sort((a, b) => b.length - a.length);
  for (const phrase of ordered) {
    if (phrase.includes(' ')) {
      scratch = scratch.replaceAll(` ${phrase} `, ' ');
      continue;
    }
    const tokens = scratch.trim().split(/\s+/);
    const kept = tokens.filter((token) => token.length > 0 && !tokenMatches(token, phrase));
    scratch = ` ${kept.join(' ')} `;
  }
  return scratch.replace(/\s+/g, ' ').trim();
}
