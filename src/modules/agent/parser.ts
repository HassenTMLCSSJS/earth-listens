import {
  SYMPHONY_LAYER_IDS,
  type Action,
  type Lang,
  type LayerId,
  type NavHref,
  type RegionId,
} from '@/core/actions';
import {
  ADD_WORDS,
  ARABIC_WORDS,
  AUDIO_MODE,
  BACK_WORDS,
  DESCRIBE_WORDS,
  ENGLISH_WORDS,
  EXPLAIN_PHRASES,
  GO_WORDS,
  HELP_WORDS,
  LAYER_LEXICON,
  NEXT_WORDS,
  NAV_LEXICON,
  PAUSE_WORDS,
  PLAY_WORDS,
  QUIZ_ANSWER_LEXICON,
  QUIZ_WORDS,
  REGION_LEXICON,
  SKIP_WORDS,
  SPEED_WORDS,
  STOP_WORDS,
  SYMPHONY_WORDS,
  VISUAL_MODE,
  YEAR_WORDS,
} from './lexicon';
import { consumePhrases, hasPhrase, normalizeUtterance, tokenMatches, tokensOf } from './normalize';

export interface ParseContext {
  layers: LayerId[];
  region: RegionId;
  inQuiz?: boolean;
}

export interface ParseResult {
  matched: boolean;
  actions: Action[];
  confidence: number;
  lang: Lang;
  normalized: string;
}

function detectLang(normalized: string): Lang {
  return /\p{Script=Arabic}/u.test(normalized) ? 'ar' : 'en';
}

function findLayers(normalized: string): { ids: LayerId[]; rest: string } {
  const ids: LayerId[] = [];
  let rest = normalized;
  const phrases = LAYER_LEXICON.flatMap((entry) =>
    entry.phrases.map((phrase) => ({ phrase, id: entry.id })),
  ).sort((a, b) => b.phrase.length - a.phrase.length);
  for (const entry of phrases) {
    const hit = entry.phrase.includes(' ')
      ? rest.includes(entry.phrase)
      : tokensOf(rest).some((token) => tokenMatches(token, entry.phrase));
    if (!hit) continue;
    if (!ids.includes(entry.id)) ids.push(entry.id);
    rest = consumePhrases(rest, [entry.phrase]);
  }
  return { ids, rest };
}

function findRegion(normalized: string): RegionId | null {
  const phrases = REGION_LEXICON.flatMap((entry) =>
    entry.phrases.map((phrase) => ({ phrase, id: entry.id })),
  ).sort((a, b) => b.phrase.length - a.phrase.length);
  for (const entry of phrases) {
    const hit = entry.phrase.includes(' ')
      ? normalized.includes(entry.phrase)
      : tokensOf(normalized).some((token) => tokenMatches(token, entry.phrase));
    if (hit) return entry.id;
  }
  return null;
}

function yearsIn(normalized: string): number[] {
  return [...normalized.matchAll(/\b(1[89]\d{2}|20\d{2}|2100)\b/g)]
    .map((match) => Number(match[1]))
    .filter((year) => year >= 1800 && year <= 2100);
}

function matchCompare(normalized: string): [number, number] | null {
  const english = /\bcompare\s+(\d{4})\s+and\s+(\d{4})\b/.exec(normalized);
  const arabic = /قارن\s+(\d{4})\s+و\s*(\d{4})/.exec(normalized);
  const match = english ?? arabic;
  if (!match?.[1] || !match[2]) return null;
  return [Number(match[1]), Number(match[2])];
}

function findNav(normalized: string): NavHref | null {
  const phrases = NAV_LEXICON.flatMap((entry) =>
    entry.phrases.map((phrase) => ({ phrase, href: entry.href })),
  ).sort((a, b) => b.phrase.length - a.phrase.length);
  for (const entry of phrases) {
    const hit = entry.phrase.includes(' ')
      ? normalized.includes(entry.phrase)
      : tokensOf(normalized).some((token) => tokenMatches(token, entry.phrase));
    if (hit) return entry.href;
  }
  return null;
}

function matchRange(normalized: string): [number, number] | null {
  const english = /\bfrom\s+(\d{4})\s+to\s+(\d{4})\b/.exec(normalized);
  const arabic = /من\s+(\d{4})\s+(?:لحد|الي|الى|ل)\s+(\d{4})/.exec(normalized);
  const match = english ?? arabic;
  if (!match?.[1] || !match[2]) return null;
  return [Number(match[1]), Number(match[2])];
}

export function parseIntent(text: string, ctx: ParseContext): ParseResult {
  const normalized = normalizeUtterance(text);
  const tokens = tokensOf(normalized);
  const lang = detectLang(normalized);
  const actions: Action[] = [];

  const explain = hasPhrase(normalized, EXPLAIN_PHRASES);
  const compare = matchCompare(normalized);
  const range = matchRange(normalized);
  const symphony = hasPhrase(normalized, SYMPHONY_WORDS);
  const stop = hasPhrase(normalized, STOP_WORDS);
  const pause = hasPhrase(normalized, PAUSE_WORDS) && !stop;
  const play = hasPhrase(normalized, PLAY_WORDS) && !stop && !pause;
  const add = hasPhrase(normalized, ADD_WORDS);
  const speed = SPEED_WORDS.find((entry) => hasPhrase(normalized, entry.phrases))?.speed;
  const mode = hasPhrase(normalized, AUDIO_MODE)
    ? 'audio_first'
    : hasPhrase(normalized, VISUAL_MODE)
      ? 'visual'
      : null;
  const language = hasPhrase(normalized, ARABIC_WORDS)
    ? 'ar'
    : hasPhrase(normalized, ENGLISH_WORDS)
      ? 'en'
      : null;
  const quizAnswer = QUIZ_ANSWER_LEXICON.find((entry) =>
    hasPhrase(normalized, entry.phrases),
  )?.answer;
  const startQuiz = hasPhrase(normalized, QUIZ_WORDS);
  const describe = hasPhrase(normalized, DESCRIBE_WORDS);
  const help = hasPhrase(normalized, HELP_WORDS);
  const skip = hasPhrase(normalized, SKIP_WORDS);
  const next = hasPhrase(normalized, NEXT_WORDS);
  const back = hasPhrase(normalized, BACK_WORDS);

  const layerHit = findLayers(normalized);
  const region = findRegion(
    consumePhrases(
      layerHit.rest,
      LAYER_LEXICON.flatMap((entry) => entry.phrases),
    ),
  );
  const years = yearsIn(normalized);
  const nav = findNav(normalized);
  const navigating = nav !== null && layerHit.ids.length === 0 && !compare && !range;
  const go = hasPhrase(normalized, GO_WORDS) || hasPhrase(normalized, YEAR_WORDS);
  const yearGo = !compare && !range && years.length === 1 && go ? years[0] : undefined;

  if (symphony) {
    actions.push({ type: 'combine_layers', ids: [...SYMPHONY_LAYER_IDS] });
  } else if (add && layerHit.ids.length > 0) {
    const ids = ctx.layers.slice();
    for (const id of layerHit.ids) if (!ids.includes(id)) ids.push(id);
    actions.push({ type: 'combine_layers', ids: ids.slice(0, 4) });
  } else if (!explain && layerHit.ids.length === 1 && layerHit.ids[0]) {
    actions.push({ type: 'select_phenomenon', id: layerHit.ids[0] });
  } else if (!explain && layerHit.ids.length > 1) {
    actions.push({ type: 'combine_layers', ids: layerHit.ids.slice(0, 4) });
  }

  if (region && !symphony) actions.push({ type: 'set_region', region });
  if (compare) actions.push({ type: 'compare_times', a: compare[0], b: compare[1] });
  else if (range) actions.push({ type: 'set_time', from: range[0], to: range[1] });
  else if (yearGo !== undefined) actions.push({ type: 'set_time', from: yearGo });

  if (mode) actions.push({ type: 'set_mode', mode });
  if (language && !layerHit.ids.length && !play && !symphony)
    actions.push({ type: 'set_language', lang: language });
  if (explain) actions.push({ type: 'explain_mapping', id: 'current', level: 'short' });
  if (describe && !explain) actions.push({ type: 'describe_frame' });
  if (quizAnswer && !explain) actions.push({ type: 'quiz_answer', answer: quizAnswer });
  if (startQuiz) actions.push({ type: 'start_quiz' });
  if (navigating && nav) actions.push({ type: 'navigate', href: nav });
  if (help) actions.push({ type: 'help' });
  if (skip) actions.push({ type: 'skip' });
  if (next && !range) actions.push({ type: 'next' });
  if (back) actions.push({ type: 'back' });

  if (stop) actions.push({ type: 'stop' });
  else if (pause) actions.push({ type: 'pause' });
  else if (speed) actions.push({ type: 'play', speed });
  else if (!navigating && (play || symphony || compare || range)) actions.push({ type: 'play' });

  return {
    matched: actions.length > 0,
    actions,
    confidence: actions.length > 0 ? 1 : 0,
    lang,
    normalized,
  };
}

export { COMMAND_TABLE } from './lexicon';
export { normalizeUtterance } from './normalize';
