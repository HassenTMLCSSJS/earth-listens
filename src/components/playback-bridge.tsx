'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/core/store';
import { getPlayer, LAYER_REGISTERS, stepSeconds } from '@/modules/sonification';

export function PlaybackBridge() {
  const status = useAppStore((state) => state.playback.status);
  const score = useAppStore((state) => state.lastScore);
  const volume = useAppStore((state) => state.settings.masterVolumeDb);
  const view = useAppStore((state) => state.view);
  useEffect(() => {
    const player = getPlayer();
    player.setMasterVolume(volume);
    if (status === 'idle') {
      player.stop();
      return;
    }
    if (score) {
      void player.init().then(() => {
        const speed = useAppStore.getState().playback.speed;
        player.play(score, {
          stepSec: stepSeconds(speed),
          tremoloDepth: (event) => {
            if (event.layerId !== 'co2') return 0;
            const series = useAppStore.getState().catalog.co2?.data.seasonalAmplitude ?? [];
            const point = series.find((item) => item.t === event.source.t);
            const amp = point && typeof point.v === 'number' ? point.v : 0;
            return Math.min(1, Math.max(0, amp / 10));
          },
          onEvent: (event) => {
            const band =
              score.mode === 'symphony'
                ? LAYER_REGISTERS[event.layerId].symphony
                : LAYER_REGISTERS[event.layerId].solo;
            const span = band[1] - band[0];
            const level = span === 0 ? 0 : Math.min(1, Math.max(0, (event.midi - band[0]) / span));
            useAppStore.getState().setVisual({
              level,
              pulse: useAppStore.getState().visual.pulse + 1,
              layerId: event.layerId,
              playheadLon: event.source.lon ?? useAppStore.getState().view.lon,
            });
          },
        });
      });
    }
  }, [status, score, volume]);
  useEffect(() => {
    getPlayer().setView(view);
  }, [view]);
  return null;
}
