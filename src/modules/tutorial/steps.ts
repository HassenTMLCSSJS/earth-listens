import type { Action, LayerId, RegionId } from '@/core/actions';
import type { NarrationId } from '@/modules/narration';

export interface TutorialSnapshot {
  layers: LayerId[];
  region: RegionId;
  time: { from: number; to: number; cursor: number };
}

export interface TutorialStep {
  id: string;
  narrationId: NarrationId;
  text: { en: string; ar: string };
  expect: (action: Action, state: TutorialSnapshot) => boolean;
  hintAfterMs: number;
  hint: { en: string; ar: string };
  skippable: true;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'listen',
    narrationId: 'tutorial.step1',
    text: { en: 'Press Listen, or say play temperature.', ar: 'دوس اسمع، أو قول شغّل الحرارة.' },
    expect: (action) => action.type === 'play',
    hintAfterMs: 10000,
    hint: { en: 'The Listen button is the big one.', ar: 'زرار اسمع هو الكبير.' },
    skippable: true,
  },
  {
    id: 'year',
    narrationId: 'tutorial.step2',
    text: { en: 'Move to 1990, or say go to 1990.', ar: 'روح لسنة ١٩٩٠.' },
    expect: (action) => action.type === 'set_time' && action.from === 1990,
    hintAfterMs: 10000,
    hint: { en: 'Type: go to 1990', ar: 'اكتب: روح لسنة ١٩٩٠' },
    skippable: true,
  },
  {
    id: 'compare',
    narrationId: 'tutorial.step3',
    text: { en: 'Compare 1900 and 2020.', ar: 'قارن ١٩٠٠ و٢٠٢٠.' },
    expect: (action) => action.type === 'compare_times' && action.a === 1900 && action.b === 2020,
    hintAfterMs: 10000,
    hint: { en: 'Type: compare 1900 and 2020', ar: 'اكتب: قارن ١٩٠٠ و٢٠٢٠' },
    skippable: true,
  },
  {
    id: 'ice',
    narrationId: 'tutorial.step4',
    text: { en: 'Add sea ice.', ar: 'ضيف الجليد.' },
    expect: (action) =>
      (action.type === 'combine_layers' && action.ids.includes('sea_ice')) ||
      (action.type === 'select_phenomenon' && action.id === 'sea_ice'),
    hintAfterMs: 10000,
    hint: { en: 'Type: add ice', ar: 'اكتب: ضيف الجليد' },
    skippable: true,
  },
  {
    id: 'rotate',
    narrationId: 'tutorial.step5',
    text: { en: 'Rotate the globe, or say go to Africa.', ar: 'لف الكرة، أو قول روح لأفريقيا.' },
    expect: (action) =>
      action.type === 'rotate_view' || (action.type === 'set_region' && action.region === 'africa'),
    hintAfterMs: 10000,
    hint: { en: 'Focus the globe and press an arrow key.', ar: 'ركز على الكرة ودوس سهم.' },
    skippable: true,
  },
  {
    id: 'explain',
    narrationId: 'tutorial.step6',
    text: { en: 'Ask what am I hearing.', ar: 'اسأل أنا بسمع إيه.' },
    expect: (action) => action.type === 'explain_mapping',
    hintAfterMs: 10000,
    hint: { en: 'Type: what am I hearing', ar: 'اكتب: أنا بسمع إيه' },
    skippable: true,
  },
  {
    id: 'quiz',
    narrationId: 'tutorial.step7',
    text: { en: 'Start the quiz.', ar: 'ابدأ الاختبار.' },
    expect: (action) => action.type === 'start_quiz',
    hintAfterMs: 10000,
    hint: { en: 'Type: quiz me', ar: 'اكتب: اختبرني' },
    skippable: true,
  },
];
