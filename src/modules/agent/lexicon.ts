import type { LayerId, QuizAnswer, RegionId, Speed } from '@/core/actions';
import { normalizeUtterance } from './normalize';

export interface LexiconEntry {
  id: string;
  en: string[];
  ar: string[];
}

function normList(values: string[]): string[] {
  return values.map((value) => normalizeUtterance(value)).filter((value) => value.length > 0);
}

export const LAYER_LEXICON: { id: LayerId; phrases: string[] }[] = [
  {
    id: 'forest',
    phrases: normList(['forest height', 'canopy', 'forest', 'غابة', 'ارتفاع الغابة']),
  },
  {
    id: 'precipitation',
    phrases: normList(['precipitation', 'rainfall', 'rain', 'مطر', 'أمطار']),
  },
  {
    id: 'events',
    phrases: normList(['natural events', 'eonet', 'events', 'أحداث', 'أحداث طبيعية']),
  },
  {
    id: 'night_lights',
    phrases: normList(['night lights', 'night brightness', 'أضواء الليل', 'اضواء الليل']),
  },
  {
    id: 'ocean_currents',
    phrases: normList(['ocean currents', 'currents', 'تيارات المحيط', 'التيارات']),
  },
  {
    id: 'ocean_sst',
    phrases: normList(['sea surface', 'ocean temperature', 'sst', 'حرارة المحيط']),
  },
  {
    id: 'air_quality',
    phrases: normList(['air quality', 'pollution', 'جودة الهواء', 'التلوث']),
  },
  {
    id: 'lightning',
    phrases: normList(['lightning', 'thunder', 'البرق', 'الرعد']),
  },
  {
    id: 'aerosols',
    phrases: normList(['aerosols', 'aerosol', 'الهباء', 'الهباء الجوي']),
  },
  {
    id: 'co2',
    phrases: normList(['carbon dioxide', 'co2', 'carbon', 'ثاني أكسيد الكربون', 'كربون']),
  },
  { id: 'sea_ice', phrases: normList(['arctic ice', 'sea ice', 'ice', 'جليد', 'ثلج']) },
  {
    id: 'wildfire',
    phrases: normList(['wildfires', 'wildfire', 'fires', 'fire', 'حرايق', 'حريق', 'نار']),
  },
  {
    id: 'temperature',
    phrases: normList(['temperature', 'temp', 'heat', 'warming', 'درجة الحرارة', 'حرارة']),
  },
];

export const REGION_LEXICON: { id: RegionId; phrases: string[] }[] = [
  { id: 'arctic', phrases: normList(['arctic', 'القطب الشمالي', 'القطب']) },
  { id: 'americas', phrases: normList(['americas', 'america', 'أمريكا', 'الامريكتين']) },
  { id: 'oceania', phrases: normList(['oceania', 'australia', 'أستراليا', 'أوقيانوسيا']) },
  { id: 'africa', phrases: normList(['africa', 'أفريقيا']) },
  { id: 'europe', phrases: normList(['europe', 'أوروبا']) },
  { id: 'egypt', phrases: normList(['egypt', 'مصر']) },
  { id: 'asia', phrases: normList(['asia', 'آسيا']) },
  { id: 'global', phrases: normList(['world', 'earth', 'globe', 'العالم', 'الأرض']) },
];

export const PLAY_WORDS = normList(['play', 'listen', 'start', 'شغّل', 'اسمع', 'ابدأ']);
export const STOP_WORDS = normList(['stop', 'pause', 'quiet', 'وقّف', 'بس', 'اسكت']);
export const ADD_WORDS = normList(['add', 'ضيف', 'زود']);
export const SYMPHONY_WORDS = normList(['everything', 'all', 'symphony', 'السيمفونية', 'كله']);
export const GO_WORDS = normList(['go to', 'jump to', 'روح', 'اذهب']);
export const YEAR_WORDS = normList(['سنة', 'عام', 'year']);
export const EXPLAIN_PHRASES = normList(['what am i hearing', 'explain', 'أنا بسمع إيه', 'اشرح']);
export const HELP_WORDS = normList(['help', 'مساعدة']);
export const SKIP_WORDS = normList(['skip', 'تخطّي']);
export const NEXT_WORDS = normList(['next', 'التالي']);
export const BACK_WORDS = normList(['back', 'رجوع']);
export const QUIZ_WORDS = normList(['quiz me', 'quiz', 'اختبرني']);
export const DESCRIBE_WORDS = normList(['describe', 'وصف', 'وصفلي']);
export const AUDIO_MODE = normList(['audio mode', 'audio-first', 'وضع الصوت']);
export const VISUAL_MODE = normList(['visual mode', 'الوضع المرئي']);
export const ENGLISH_WORDS = normList(['english', 'انجليزي']);
export const ARABIC_WORDS = normList(['arabic', 'عربي']);
export const SLOWER_WORDS = normList(['slower', 'أبطأ']);
export const FASTER_WORDS = normList(['faster', 'أسرع']);

export const QUIZ_ANSWER_LEXICON: { answer: QuizAnswer; phrases: string[] }[] = [
  { answer: 'unchanged', phrases: normList(['unchanged', 'same', 'زي ما هو']) },
  { answer: 'increased', phrases: normList(['increased', 'زاد']) },
  { answer: 'decreased', phrases: normList(['decreased', 'قل']) },
];

export const SPEED_WORDS: { speed: Speed; phrases: string[] }[] = [
  { speed: 'slow', phrases: SLOWER_WORDS },
  { speed: 'fast', phrases: FASTER_WORDS },
];

/** Rendered by the Guide so the command list cannot drift from the parser. */
export const COMMAND_TABLE: LexiconEntry[] = [
  { id: 'play', en: ['play', 'listen', 'start'], ar: ['شغّل', 'اسمع', 'ابدأ'] },
  { id: 'stop', en: ['stop', 'pause', 'quiet'], ar: ['وقّف', 'بس', 'اسكت'] },
  { id: 'add', en: ['add'], ar: ['ضيف', 'زود'] },
  { id: 'symphony', en: ['everything', 'all', 'symphony'], ar: ['السيمفونية', 'كله'] },
  { id: 'go', en: ['go to', 'jump to'], ar: ['روح', 'اذهب'] },
  { id: 'compare', en: ['compare X and Y'], ar: ['قارن X و Y'] },
  { id: 'range', en: ['from X to Y'], ar: ['من X لـ Y', 'من X الى Y', 'من X لحد Y'] },
  { id: 'slower', en: ['slower'], ar: ['أبطأ'] },
  { id: 'faster', en: ['faster'], ar: ['أسرع'] },
  { id: 'explain', en: ['what am I hearing', 'explain'], ar: ['أنا بسمع إيه', 'اشرح'] },
  { id: 'quiz', en: ['quiz me', 'quiz'], ar: ['اختبرني'] },
  { id: 'audio-mode', en: ['audio mode'], ar: ['وضع الصوت'] },
  { id: 'visual-mode', en: ['visual mode'], ar: ['الوضع المرئي'] },
  { id: 'describe', en: ['describe'], ar: ['وصف', 'وصفلي'] },
  { id: 'english', en: ['english'], ar: ['انجليزي'] },
  { id: 'arabic', en: ['arabic'], ar: ['عربي'] },
  { id: 'help', en: ['help'], ar: ['مساعدة'] },
  { id: 'skip', en: ['skip'], ar: ['تخطّي'] },
  { id: 'next', en: ['next'], ar: ['التالي'] },
  { id: 'back', en: ['back'], ar: ['رجوع'] },
  { id: 'increased', en: ['increased'], ar: ['زاد'] },
  { id: 'decreased', en: ['decreased'], ar: ['قل'] },
  { id: 'unchanged', en: ['same', 'unchanged'], ar: ['زي ما هو'] },
];
