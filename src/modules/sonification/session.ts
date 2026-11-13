import { createPlayer, type Player } from './player';

let player: Player | null = null;

export function getPlayer(): Player {
  player ??= createPlayer();
  return player;
}

/** Starts audio inside a user gesture. Safe to call more than once. */
export function unlockAudio(): void {
  void getPlayer().init();
}
