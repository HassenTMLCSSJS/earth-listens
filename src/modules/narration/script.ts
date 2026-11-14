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
  'gate.prompt': {
    en: 'Hi, welcome to Earth Listens. To travel with sound, press Space, or just say "Listen". To look around, pick a language on the screen.',
    ar: 'أهلًا بيك في Earth Listens. لو حابب تسافر بالصوت، دوس مسافة، أو قول "اسمع". ولو حابب تتفرّج، اختار اللغة من على الشاشة.',
  },
  'gate.reprompt': {
    en: 'Still with me? Press Space, or say "Listen", and we\'ll start the journey together.',
    ar: 'لسه معايا؟ دوس مسافة، أو قول "اسمع"، ونبدأ الرحلة سوا.',
  },
  'gate.welcome_back': {
    en: "Welcome back. The Earth is still talking. Let's listen.",
    ar: 'أهلًا بيك تاني. الأرض لسه بتحكي، يلا نسمع.',
  },
  'mode.listening.confirm': {
    en: "Perfect, we'll travel with sound. I'll describe everything for you, and you can talk to me any time: press Alt Shift T, or tap the microphone.",
    ar: 'تمام، هنسافر بالصوت. هوصفلك كل حاجة، وتقدر تكلمني في أي وقت: دوس ألت شيفت تي، أو المس المايك.',
  },
  'mode.visual.confirm': {
    en: 'Great. Captions are on, and the sound is yours to control.',
    ar: 'حلو. الترجمة شغالة، والصوت تحت إيدك.',
  },
  'mode.default_listening': {
    en: 'I\'ll start with sound and captions. You can say "visual mode" any time.',
    ar: 'هبدأ بالصوت والترجمة. تقدر تقول "الوضع المرئي" في أي وقت.',
  },
  'mode.default_visual': {
    en: 'I\'ll start with captions and sound. Say "listening mode" any time to travel by ear.',
    ar: 'هبدأ بالترجمة والصوت. قول "وضع الاستماع" في أي وقت عشان تسافر بودانك.',
  },
  'err.mic_denied': {
    en: "I can't hear you, because the microphone is off. That's okay: use the keyboard, or type your commands.",
    ar: 'مش قادر أسمعك، عشان المايك مقفول. مفيش مشكلة: استخدم الكيبورد، أو اكتب أوامرك.',
  },
  'err.didnt_catch': {
    en: 'Sorry, I didn\'t catch that. Try again, or say "help".',
    ar: 'معلش، ماسمعتش كويس. جرّب تاني، أو قول "مساعدة".',
  },
  'lang.switched': {
    en: 'Switched to English.',
    ar: 'حوّلنا للعربي.',
  },
  'intro.l1': {
    en: 'Every day, Earth experiences countless changes around us.',
    ar: 'كل يوم، الأرض بتشهد تغيّرات كتير حوالينا.',
  },
  'intro.l2': {
    en: 'Temperatures rise and fall, forests are affected, and storms begin to form.',
    ar: 'درجات الحرارة بتتغير، الغابات بتتأثر، والعواصف بتتكوّن.',
  },
  'intro.l3': {
    en: 'With Earth Listens, you can discover these phenomena through sounds generated from real scientific data.',
    ar: 'مع Earth Listens، تقدر تكتشف الظواهر دي من خلال أصوات ناتجة عن البيانات العلمية الحقيقية.',
  },
  'intro.l4': {
    en: "Each phenomenon has its own unique sound, helping you better understand what's happening on our planet.",
    ar: 'كل ظاهرة ليها صوت مختلف، وكل صوت بيساعدك تفهم أكتر إيه اللي بيحصل على كوكبنا.',
  },
  'intro.l5': {
    en: 'Discover the world not just with your eyes, but with your ears.',
    ar: 'اكتشف العالم مش بس بعينيك، لكن كمان بودانك.',
  },
  'intro.l6': {
    en: "Earth Listens – Listen to the Earth's story.",
    ar: "Earth Listens – Listen to the Earth's story.",
  },
  'intro.l7': {
    en: 'Open the application and start your journey!',
    ar: 'افتح التطبيق وابدأ رحلتك!',
  },
  'intro.l7_alt': {
    en: "Let's begin your journey!",
    ar: 'يلا نبدأ رحلتك!',
  },
  'menu.main': {
    en: 'Where would you like to go? One: explore the Earth. Two: a quick tutorial. Three: how the sounds work. Four: the quiz. Say it, or press its number.',
    ar: 'تحب تروح فين؟ واحد: استكشف الأرض. اتنين: درس سريع. تلاتة: إزاي الأصوات بتشتغل. أربعة: الاختبار. قولها، أو دوس رقمها.',
  },
  'menu.reprompt': {
    en: 'Take your time. Say explore, tutorial, sounds, or quiz.',
    ar: 'خد وقتك. قول استكشف، أو الدرس، أو الأصوات، أو الاختبار.',
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
