'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAppStore } from '@/core/store';
import { parseIntent } from '@/modules/agent';
import { announce } from '@/modules/narration';
import { unlockAudio } from '@/modules/sonification';
import { IconButton } from '@/components/ui/icon-button';

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
    <IconButton aria-label={t('header.talk')} aria-pressed={busy} onClick={() => void talk()}>
      {t('header.talk')}
    </IconButton>
  );
}
