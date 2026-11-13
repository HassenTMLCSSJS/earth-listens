'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/core/store';
import { getPlayer } from '@/modules/sonification';

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
        player.play(score);
      });
    }
  }, [status, score, volume]);
  useEffect(() => {
    getPlayer().setView(view);
  }, [view]);
  return null;
}
