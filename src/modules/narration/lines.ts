import type { Lang } from '@/core/actions';
import { EARCON_LABELS } from './earcons';
import { NARRATION_IDS } from './speak';
import { SCRIPTS } from './script';

export type NarrationKind = 'script' | 'explanation' | 'region' | 'earcon';

export interface NarrationLine {
  id: string;
  lang: Lang;
  kind: NarrationKind;
  text: string;
}

export interface ExplanationCopy {
  id: string;
  level: 'short' | 'detailed';
  text: { en: string; ar: string };
}

export interface RegionCopy {
  id: string;
  centre: [number, number];
  label: { en: string; ar: string };
}

function pushBoth(
  lines: NarrationLine[],
  id: string,
  kind: NarrationKind,
  text: { en: string; ar: string },
): void {
  lines.push({ id, lang: 'en', kind, text: text.en });
  lines.push({ id, lang: 'ar', kind, text: text.ar });
}

/** Every fixed line the Chatterbox pipeline is allowed to render. */
export function collectNarrationLines(input: {
  explanations: ExplanationCopy[];
  regions: RegionCopy[];
}): NarrationLine[] {
  const lines: NarrationLine[] = [];
  for (const id of NARRATION_IDS) pushBoth(lines, id, 'script', SCRIPTS[id]);
  for (const item of input.explanations) {
    pushBoth(lines, `${item.id}.${item.level}`, 'explanation', item.text);
  }
  for (const region of input.regions) {
    const [lat, lon] = region.centre;
    pushBoth(lines, `region.${region.id}`, 'region', {
      en: `${region.label.en}. Centre ${lat} degrees latitude, ${lon} degrees longitude.`,
      ar: `${region.label.ar}. مركزها عند خط عرض ${lat} وخط طول ${lon}.`,
    });
  }
  for (const [id, text] of Object.entries(EARCON_LABELS) as [
    keyof typeof EARCON_LABELS,
    { en: string; ar: string },
  ][]) {
    pushBoth(lines, `earcon.${id}`, 'earcon', text);
  }
  return lines;
}
