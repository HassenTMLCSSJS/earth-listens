'use client';

import { useTranslations } from 'next-intl';
import { SYMPHONY_LAYER_IDS } from '@/core/actions';
import { useAppStore } from '@/core/store';
import { unlockAudio } from '@/modules/sonification';
import { OverlayStage } from '@/modules/models';
import { Jukebox } from '@/components/jukebox';
import { Button } from '@/components/ui/button';

export function SymphonyFinale() {
  const t = useTranslations();
  const dispatch = useAppStore((state) => state.dispatch);
  const playing = useAppStore((state) => state.playback.status) === 'playing';
  const lang = useAppStore((state) => state.lang);
  const reduced = useAppStore((state) => state.settings.reducedMotion) === 'on';

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-8">
      <h1 className="display text-5xl">{t('symphony.title')}</h1>
      <p className="v5-lead">{t('symphony.lead')}</p>
      <div className="v5-card overflow-hidden p-5">
        <OverlayStage
          ids={['inst_oud', 'inst_darbuka', 'inst_qanun', 'inst_bowl']}
          lang={lang}
          playing={playing}
          intensity={0.7}
          reducedMotion={reduced}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          className="rounded-full"
          aria-pressed={playing}
          onClick={() => {
            unlockAudio();
            dispatch({ type: 'combine_layers', ids: [...SYMPHONY_LAYER_IDS] }, 'pointer');
            dispatch({ type: 'play' }, 'pointer');
          }}
        >
          {t('symphony.play')}
        </Button>
        <p className="text-ink-subtle text-sm">{t('symphony.sampleNote')}</p>
      </div>
      <Jukebox embedded />
    </section>
  );
}
