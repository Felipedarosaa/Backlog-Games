import type { RawgGameDetails } from './rawg';
import type { GameEntry } from '../types/game';
import { makeId } from '../utils/id';
import { nowISO } from '../utils/time';

export function gameFromRawg(details: RawgGameDetails, currentPlatform?: string): GameEntry {
  const now = nowISO();
  const genres = (details.genres ?? []).map((g) => g.name).filter(Boolean);
  const platforms = (details.platforms ?? [])
    .map((p) => p.platform?.name)
    .filter((p): p is string => Boolean(p));

  return {
    id: makeId('game'),
    rawgId: details.id,
    title: details.name,
    coverUrl: details.background_image ?? undefined,
    description: details.description_raw ?? undefined,
    released: details.released ?? undefined,
    genres,
    platforms,
    currentPlatform: currentPlatform?.trim() || undefined,
    metacritic: details.metacritic ?? undefined,
    status: 'backlog',
    rating: undefined,
    targetHours: undefined,
    sessions: [],
    createdAtISO: now,
    updatedAtISO: now,
  };
}
