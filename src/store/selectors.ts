import type { GameEntry } from '../types/game';

export function getTotalMinutes(game: GameEntry) {
  const sum = (game.sessions ?? []).reduce((acc, s) => acc + (Number(s.minutes) || 0), 0);
  return Math.max(0, sum);
}

export function getProgressRatio(game: GameEntry) {
  const targetHours = game.targetHours;
  if (!targetHours || targetHours <= 0) return undefined;
  const minutes = getTotalMinutes(game);
  const hours = minutes / 60;
  return Math.min(1, Math.max(0, hours / targetHours));
}
