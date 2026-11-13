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
    announce({ en: "I didn't catch that, say help", ar: 'مش فاهم، قول مساعدة' });
  }

  return (
    <form
      className="flex min-w-0 flex-1 items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <label className="flex min-w-0 flex-1 flex-col text-sm" htmlFor="command">
        {t('label')}
        <input
          id="command"
          name="command"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t('placeholder')}
          autoComplete="off"
          className="bg-space-950 text-ink mt-1 min-h-11 rounded-full border border-white/20 px-4 text-base"
        />
      </label>
      <button type="submit" className="min-h-11 rounded-full border border-white/20 px-4">
        {t('label')}
      </button>
    </form>
  );
}
