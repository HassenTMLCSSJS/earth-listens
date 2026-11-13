export interface Shortcut {
  keys: string;
  id: string;
  en: string;
  ar: string;
}

export const SHORTCUTS: Shortcut[] = [
  { keys: 'Alt+Shift+T', id: 'talk', en: 'Talk', ar: 'تكلم' },
  { keys: 'Alt+Shift+S', id: 'stop', en: 'Stop audio', ar: 'وقف الصوت' },
  { keys: '?', id: 'help', en: 'Help', ar: 'مساعدة' },
  { keys: '/', id: 'command', en: 'Focus the command box', ar: 'ركّز على صندوق الأوامر' },
  {
    keys: 'Escape',
    id: 'escape',
    en: 'Skip the intro or close a dialog',
    ar: 'تخطّ المقدمة أو اقفل النافذة',
  },
  {
    keys: '1 / 2 / 3',
    id: 'quiz',
    en: 'Quiz answers, only on the quiz',
    ar: 'إجابات الاختبار، في الاختبار بس',
  },
  {
    keys: 'PageDown / PageUp',
    id: 'chapters',
    en: 'Next or previous story chapter',
    ar: 'الفصل التالي أو السابق',
  },
  {
    keys: 'Arrow keys',
    id: 'globe',
    en: 'Rotate the globe when it is focused',
    ar: 'لف الكرة وهي مركّزة',
  },
  { keys: 'Home', id: 'home', en: 'Reset the globe view', ar: 'ارجع لمكان الكرة الأصلي' },
];

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}
