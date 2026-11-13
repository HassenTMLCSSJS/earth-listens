import type { NarrationId } from './speak';

export const SCRIPTS: Record<NarrationId, { en: string; ar: string }> = {
  'intro.line1': { en: 'Earth is always making a sound.', ar: 'الأرض دايمًا بتطلّع صوت.' },
  'intro.line2': { en: 'Can you hear the change?', ar: 'سامع التغيير؟' },
  'onboarding.main': {
    en: "Welcome to Earth Listens. Every sound here is a real NASA measurement. Higher notes mean more, louder means stronger, faster rhythm means faster change, and where you hear it is where it happens on Earth. Choose Audio-first mode or Visual mode. Press Talk or Alt+Shift+T and say 'play temperature', or say 'help' at any time.",
    ar: "أهلًا بيك في Earth Listens. كل صوت هنا قياس حقيقي من ناسا. النغمة لما تعلى يبقى الكمية زادت، الصوت لما يعلى يبقى الظاهرة أقوى، الإيقاع لما يسرع يبقى التغيير أسرع، والمكان اللي بتسمع منه الصوت هو مكانه على الأرض. اختار وضع الصوت أولًا أو الوضع المرئي. دوس على زرار الكلام وقول 'شغّل الحرارة'، أو قول 'مساعدة' في أي وقت.",
  },
  'story.ch1': {
    en: 'Earth is always making a sound. A slow drone is the planet breathing in numbers.',
    ar: 'الأرض دايمًا بتطلّع صوت. الدندنة البطيئة هي الكوكب وهو بيتنفس أرقام.',
  },
  'story.ch2': {
    en: 'NASA sees the planet in pictures. Earth Listens turns those pictures into sound.',
    ar: 'ناسا بتشوف الكوكب في صور. Earth Listens بيحوّل الصور دي لصوت.',
  },
  'story.ch3': {
    en: 'Not everyone can see those pictures. The numbers behind this chapter still need Basmala’s check. [citation needed: Basmala]',
    ar: 'مش كل الناس تقدر تشوف الصور دي. الأرقام لسه محتاجة مراجعة بسمة. [citation needed: Basmala]',
  },
  'story.ch4': {
    en: 'Five questions become five parts of a sound: where, how much, how strong, how fast, and what.',
    ar: 'خمس أسئلة بتبقى خمس أجزاء من الصوت: فين، قد إيه، قد إيه قوي، قد إيه سريع، وإيه.',
  },
  'story.ch5': {
    en: 'Travel the sample years from 1880 to 2025. The pitch follows the sample series.',
    ar: 'سافر في السنين التجريبية من ١٨٨٠ لـ ٢٠٢٥. النغمة ماشية مع السلسلة التجريبية.',
  },
  'story.ch6': {
    en: 'Hear the planet. Start listening, switch to audio-first, take the tutorial, or guess the Earth.',
    ar: 'اسمع الكوكب. ابدأ الاستماع، أو وضع الصوت أولًا، أو الدرس، أو خمّن الأرض.',
  },
  'tutorial.step1': {
    en: 'Press Listen, or say play temperature.',
    ar: 'دوس اسمع، أو قول شغّل الحرارة.',
  },
  'tutorial.step2': {
    en: 'Move the years to 1990, or say go to 1990.',
    ar: 'حرّك السنين لسنة ١٩٩٠، أو قول روح لسنة ١٩٩٠.',
  },
  'tutorial.step3': {
    en: 'Say or type compare 1900 and 2020.',
    ar: 'قول أو اكتب قارن ١٩٠٠ و٢٠٢٠.',
  },
  'tutorial.step4': { en: 'Add sea ice.', ar: 'ضيف الجليد.' },
  'tutorial.step5': {
    en: 'Rotate the globe with the arrow keys, or say go to Africa.',
    ar: 'لف الكرة بالأسهم، أو قول روح لأفريقيا.',
  },
  'tutorial.step6': { en: 'Ask what am I hearing.', ar: 'اسأل أنا بسمع إيه.' },
  'tutorial.step7': { en: 'Start the quiz.', ar: 'ابدأ الاختبار.' },
  'quiz.intro': {
    en: 'Guess the Earth. You will hear a clip. Did it increase, decrease, or stay the same?',
    ar: 'خمّن الأرض. هتسمع مقطع. زاد، قل، ولا زي ما هو؟',
  },
  'quiz.question': {
    en: 'Did it increase, decrease, or stay the same?',
    ar: 'زاد، قل، ولا زي ما هو؟',
  },
  'quiz.correct': {
    en: 'Yes. That matches the sample series.',
    ar: 'صح. ده مطابق للسلسلة التجريبية.',
  },
  'quiz.wrong': {
    en: 'Not this time. The sample series says otherwise.',
    ar: 'مش المرة دي. السلسلة التجريبية بتقول غير كده.',
  },
  'quiz.end': {
    en: 'Quiz complete. Could you explore this without help?',
    ar: 'الاختبار خلّص. قدرت تستكشف من غير مساعدة؟',
  },
  'help.commands': {
    en: 'Say play temperature, stop, go to 1990, compare 1900 and 2020, or help.',
    ar: 'قول شغّل الحرارة، وقّف، روح لسنة ١٩٩٠، قارن ١٩٠٠ و٢٠٢٠، أو مساعدة.',
  },
};

export function narrationText(id: NarrationId): { en: string; ar: string } {
  return SCRIPTS[id];
}

export function withSampleNote(
  text: { en: string; ar: string },
  sample: boolean,
): { en: string; ar: string } {
  if (!sample) return text;
  return {
    en: text.en.replace('real NASA measurement', 'real NASA measurement (sample data for now)'),
    ar: text.ar.replace('قياس حقيقي من ناسا', 'قياس حقيقي من ناسا (بيانات تجريبية حاليًا)'),
  };
}
