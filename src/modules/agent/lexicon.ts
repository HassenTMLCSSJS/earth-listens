import type { LayerId, NavHref, QuizAnswer, RegionId, Speed } from '@/core/actions';
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
    phrases: normList(['forest height', 'canopy', 'forest', 'غابة', 'طول الغابات']),
  },
  {
    id: 'precipitation',
    phrases: normList(['precipitation', 'rainfall', 'rain', 'مطر', 'شتا']),
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
    phrases: normList(['air quality', 'pollution', 'جودة الهوا', 'التلوث']),
  },
  {
    id: 'lightning',
    phrases: normList(['lightning', 'thunder', 'البرق', 'الرعد']),
  },
  {
    id: 'aerosols',
    phrases: normList(['aerosols', 'aerosol', 'الغبار', 'الدخان', 'الغبار والدخان']),
  },
  {
    id: 'co2',
    phrases: normList(['carbon dioxide', 'co2', 'carbon', 'ثاني أكسيد الكربون', 'كربون']),
  },
  { id: 'sea_ice', phrases: normList(['arctic ice', 'sea ice', 'ice', 'جليد', 'الجليد البحري']) },
  {
    id: 'wildfire',
    phrases: normList(['wildfires', 'wildfire', 'fires', 'fire', 'حرايق', 'حريقة', 'نار']),
  },
  {
    id: 'temperature',
    phrases: normList(['temperature', 'temp', 'heat', 'warming', 'حرارة', 'الحرارة']),
  },
];

export const REGION_LEXICON: { id: RegionId; phrases: string[] }[] = [
  { id: 'arctic', phrases: normList(['arctic', 'القطب الشمالي', 'القطب']) },
  { id: 'americas', phrases: normList(['americas', 'america', 'أمريكا', 'الأمريكتين']) },
  { id: 'oceania', phrases: normList(['oceania', 'australia', 'أستراليا', 'أوقيانوسيا']) },
  { id: 'africa', phrases: normList(['africa', 'أفريقيا']) },
  { id: 'europe', phrases: normList(['europe', 'أوروبا']) },
  { id: 'egypt', phrases: normList(['egypt', 'مصر']) },
  { id: 'asia', phrases: normList(['asia', 'آسيا']) },
  { id: 'global', phrases: normList(['world', 'earth', 'globe', 'العالم', 'الأرض', 'الكوكب كله']) },
];

export const PLAY_WORDS = normList(['play', 'listen', 'start', 'شغّل', 'اسمع', 'ابدأ']);
export const STOP_WORDS = normList(['stop', 'quiet', 'وقّف', 'بس', 'اسكت']);
export const PAUSE_WORDS = normList(['pause', 'استنى', 'استني']);
export const ADD_WORDS = normList(['add', 'ضيف', 'زود']);
export const SYMPHONY_WORDS = normList(['everything', 'all', 'symphony', 'السيمفونية', 'كله']);
export const GO_WORDS = normList(['go to', 'jump to', 'روح', 'روح لـ']);
export const YEAR_WORDS = normList(['سنة', 'year']);
export const EXPLAIN_PHRASES = normList(['what am i hearing', 'explain', 'أنا بسمع إيه', 'اشرح']);
export const HELP_WORDS = normList(['help', 'مساعدة']);
export const SKIP_WORDS = normList(['skip', 'عدّي']);
export const NEXT_WORDS = normList(['next', 'اللي بعده']);
export const BACK_WORDS = normList(['back', 'رجوع']);
export const QUIZ_WORDS = normList(['quiz me', 'quiz', 'اختبرني']);
export const DESCRIBE_WORDS = normList(['describe', 'وصف', 'وصفلي']);
export const AUDIO_MODE = normList([
  'audio mode',
  'audio-first',
  'listening mode',
  'وضع الصوت',
  'وضع الاستماع',
]);
export const VISUAL_MODE = normList(['visual mode', 'الوضع المرئي']);
export const ENGLISH_WORDS = normList(['english', 'انجليزي']);
export const ARABIC_WORDS = normList(['arabic', 'عربي']);
export const SLOWER_WORDS = normList(['slower', 'أبطأ']);
export const FASTER_WORDS = normList(['faster', 'أسرع']);

export const NAV_LEXICON: { href: NavHref; phrases: string[] }[] = [
  { href: '/tutorial', phrases: normList(['tutorial', 'teach me', 'علّمني', 'الدرس']) },
  {
    href: '/how-it-sounds',
    phrases: normList(['how it sounds', 'how the sounds work', 'الأصوات', 'إزاي بتشتغل']),
  },
  { href: '/settings', phrases: normList(['open settings', 'الإعدادات']) },
  { href: '/guide', phrases: normList(['open the guide', 'الدليل']) },
  { href: '/data', phrases: normList(['data page', 'صفحة البيانات']) },
  { href: '/symphony', phrases: normList(['open the symphony', 'سيمفونية الأرض']) },
  { href: '/quiz', phrases: normList(['open the quiz', 'افتح الاختبار']) },
  { href: '/listen', phrases: normList(['explore', 'استكشف', 'الكرة']) },
  { href: '/', phrases: normList(['go home', 'الحكاية']) },
];

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
  { id: 'stop', en: ['stop', 'quiet'], ar: ['وقّف', 'بس', 'اسكت'] },
  { id: 'pause', en: ['pause'], ar: ['استنى'] },
  {
    id: 'explore',
    en: ['explore', 'teach me', 'how it sounds'],
    ar: ['استكشف', 'الدرس', 'الأصوات'],
  },
  { id: 'add', en: ['add'], ar: ['ضيف', 'زود'] },
  { id: 'symphony', en: ['everything', 'all', 'symphony'], ar: ['السيمفونية', 'كله'] },
  { id: 'go', en: ['go to', 'jump to'], ar: ['روح', 'روح لـ'] },
  { id: 'compare', en: ['compare X and Y'], ar: ['قارن X و Y'] },
  { id: 'range', en: ['from X to Y'], ar: ['من X لـ Y', 'من X لحد Y'] },
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
  { id: 'skip', en: ['skip'], ar: ['عدّي'] },
  { id: 'next', en: ['next'], ar: ['اللي بعده'] },
  { id: 'back', en: ['back'], ar: ['رجوع'] },
  { id: 'increased', en: ['increased'], ar: ['زاد'] },
  { id: 'decreased', en: ['decreased'], ar: ['قل'] },
  { id: 'unchanged', en: ['same', 'unchanged'], ar: ['زي ما هو'] },
];
