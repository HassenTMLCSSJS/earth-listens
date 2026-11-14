'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { parseIntent } from '@/modules/agent';
import { announce } from '@/modules/narration';
import { unlockAudio } from '@/modules/sonification';
import { useAppStore } from '@/core/store';

export function CommandBox() {
  const t = useTranslations('command');
  const [value, setValue] = useState('');
  const dispatch = useAppStore((state) => state.dispatch);
  const layers = useAppStore((state) => state.layers);
  const region = useAppStore((state) => state.region);
  const quiz = useAppStore((state) => state.quiz);
  const demo = useAppStore((state) => state.demo);
  const lang = useAppStore((state) => state.lang);

  async function submit() {
    const text = value.trim();
    if (!text) return;
    unlockAudio();
    const parsed = parseIntent(text, { layers, region, inQuiz: Boolean(quiz?.open) });
    if (parsed.matched) {
      for (const action of parsed.actions) dispatch(action, 'keyboard');
      setValue('');
      return;
    }
    if (!demo && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const response = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text, lang, state: { layers, region }, layerSummary: [] }),
        });
        if (response.ok) {
          const body = (await response.json()) as {
            actions?: Parameters<typeof dispatch>[0][];
            say?: { en?: string; ar?: string };
          };
          for (const action of body.actions ?? []) dispatch(action, 'agent');
          if (body.say?.en || body.say?.ar)
            announce({ en: body.say.en ?? '', ar: body.say.ar ?? '' });
          setValue('');
          return;
        }
      } catch {
        /* Offline or blocked. The typed box remains the interface. */
      }
    }
    announce({
      en: 'Sorry, I didn\'t catch that. Try again, or say "help".',
      ar: 'معلش، ماسمعتش كويس. جرّب تاني، أو قول "مساعدة".',
    });
  }

  return (
    <form
      className="flex min-w-0 flex-1 items-center"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <label htmlFor="command" className="sr-only">
        {t('label')}
      </label>
      <span className="relative flex min-w-0 flex-1 items-center">
        <input
          id="command"
          name="command"
          aria-label={t('label')}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t('placeholder')}
          autoComplete="off"
          className="border-line text-ink placeholder:text-ink-subtle focus-visible:border-line-strong h-12 w-full min-w-0 rounded-full border bg-white/[0.04] px-4 pe-10 text-base transition-colors outline-none"
        />
        <kbd
          aria-hidden="true"
          className="border-line-strong text-ink-muted pointer-events-none absolute end-3 rounded-[7px] border border-b-2 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[11px]"
        >
          /
        </kbd>
      </span>
      <button type="submit" className="sr-only">
        {t('label')}
      </button>
    </form>
  );
}
