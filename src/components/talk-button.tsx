'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Mic } from 'lucide-react';
import { useAppStore } from '@/core/store';
import { parseIntent } from '@/modules/agent';
import { announce } from '@/modules/narration';
import { unlockAudio } from '@/modules/sonification';

export function TalkButton() {
  const t = useTranslations();
  const dispatch = useAppStore((state) => state.dispatch);
  const demo = useAppStore((state) => state.demo);
  const [busy, setBusy] = useState(false);

  async function talk() {
    unlockAudio();
    const state = useAppStore.getState();
    if (demo || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      document.getElementById('command')?.focus();
      return;
    }
    try {
      setBusy(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });
      recorder.start();
      window.setTimeout(() => {
        if (recorder.state !== 'inactive') recorder.stop();
      }, 3500);
      await stopped;
      stream.getTracks().forEach((track) => track.stop());
      const { transcribeClip } = await import('@/modules/voice');
      const heard = await transcribeClip(
        new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }),
        state.lang,
        AbortSignal.timeout(6000),
      );
      if (heard.language !== useAppStore.getState().lang) {
        dispatch({ type: 'set_language', lang: heard.language }, 'voice');
      }
      const latest = useAppStore.getState();
      const parsed = parseIntent(heard.text, {
        layers: latest.layers,
        region: latest.region,
        inQuiz: Boolean(latest.quiz?.open),
      });
      if (parsed.matched) {
        if (parsed.lang !== latest.lang)
          dispatch({ type: 'set_language', lang: parsed.lang }, 'voice');
        for (const action of parsed.actions) dispatch(action, 'voice');
      } else {
        announce({
          en: 'Sorry, I didn\'t catch that. Try again, or say "help".',
          ar: 'معلش، ماسمعتش كويس. جرّب تاني، أو قول "مساعدة".',
        });
        document.getElementById('command')?.focus();
      }
    } catch {
      document.getElementById('command')?.focus();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      aria-label={t('header.talk')}
      aria-pressed={busy}
      title={t('header.talk')}
      onClick={() => void talk()}
      className="group text-on-gold relative size-12 shrink-0 rounded-full shadow-[0_0_0_1px_rgb(255_217_138/.5),0_0_32px_rgb(242_196_109/.35)] transition-transform duration-200 outline-none [background:radial-gradient(circle_at_35%_30%,#fff3d1,#ffd98a_30%,#f2a93b_62%,#7a4a10_100%)] hover:scale-105 focus-visible:scale-105 active:scale-95 aria-pressed:animate-pulse"
    >
      <Mic
        className="pointer-events-none absolute start-1/2 top-1/2 -ms-2.5 -mt-2.5 size-5"
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </button>
  );
}
