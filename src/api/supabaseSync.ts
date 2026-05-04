import { supabase } from './supabase';
import type { AchievementUnlock, GameEntry, GameList, GameSession } from '../types/game';

type DbGameRow = {
  user_id: string;
  id: string;
  rawg_id: number | null;
  title: string;
  cover_url: string | null;
  description: string | null;
  released: string | null;
  genres: string[];
  platforms: string[];
  current_platform: string | null;
  metacritic: number | null;
  status: string;
  rating: number | null;
  rating_note: string | null;
  target_hours: number | null;
  hltb: any | null;
  price_paid: number | null;
  purchased_at_iso: string | null;
  created_at: string;
  updated_at: string;
};

type DbListRow = {
  user_id: string;
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type DbListGameRow = {
  user_id: string;
  list_id: string;
  game_id: string;
};

type DbSessionRow = {
  user_id: string;
  id: string;
  game_id: string;
  created_at: string;
  minutes: number;
  note: string | null;
};

type DbAchievementRow = {
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
};

type DbProfileRow = {
  id: string;
  username: string;
  rawg_api_key?: string | null;
  hltb_base_url?: string | null;
};

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, rawg_api_key, hltb_base_url')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return {
    username: typeof (data as any)?.username === 'string' ? String((data as any).username) : undefined,
    rawgApiKey: typeof (data as any)?.rawg_api_key === 'string' ? String((data as any).rawg_api_key) : undefined,
    hltbBaseUrl: typeof (data as any)?.hltb_base_url === 'string' ? String((data as any).hltb_base_url) : undefined,
  };
}

export async function isUsernameAvailable(username: string) {
  const { data, error } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle();
  if (error) throw error;
  return !data;
}

export async function upsertProfile(userId: string, username: string) {
  const row: DbProfileRow = { id: userId, username };
  const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

export async function updateProfileSettings(userId: string, patch: { rawgApiKey?: string; hltbBaseUrl?: string }) {
  const row = {
    rawg_api_key: typeof patch.rawgApiKey === 'string' ? patch.rawgApiKey : null,
    hltb_base_url: typeof patch.hltbBaseUrl === 'string' ? patch.hltbBaseUrl : null,
  };
  const { error } = await supabase.from('profiles').update(row).eq('id', userId);
  if (error) throw error;
}

export async function pullAll(userId: string) {
  const [{ data: games, error: gamesErr }, { data: lists, error: listsErr }, { data: listGames, error: listGamesErr }, { data: sessions, error: sessionsErr }, { data: achievements, error: achievementsErr }] =
    await Promise.all([
      supabase.from('games').select('*').eq('user_id', userId),
      supabase.from('lists').select('*').eq('user_id', userId),
      supabase.from('list_games').select('*').eq('user_id', userId),
      supabase.from('sessions').select('*').eq('user_id', userId),
      supabase.from('achievements_unlocked').select('*').eq('user_id', userId),
    ]);
  if (gamesErr) throw gamesErr;
  if (listsErr) throw listsErr;
  if (listGamesErr) throw listGamesErr;
  if (sessionsErr) throw sessionsErr;
  if (achievementsErr) throw achievementsErr;

  const sessionsByGameId = new Map<string, GameSession[]>();
  for (const r of (sessions ?? []) as any as DbSessionRow[]) {
    const s: GameSession = {
      id: String(r.id),
      createdAtISO: String(r.created_at),
      minutes: Number(r.minutes),
      note: r.note ?? undefined,
    };
    const arr = sessionsByGameId.get(String(r.game_id)) ?? [];
    arr.push(s);
    sessionsByGameId.set(String(r.game_id), arr);
  }
  for (const arr of sessionsByGameId.values()) {
    arr.sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO));
  }

  const gamesOut: GameEntry[] = ((games ?? []) as any as DbGameRow[]).map((r) => ({
    id: String(r.id),
    rawgId: r.rawg_id ?? undefined,
    title: String(r.title),
    coverUrl: r.cover_url ?? undefined,
    description: r.description ?? undefined,
    released: r.released ?? undefined,
    genres: Array.isArray(r.genres) ? r.genres.map(String) : [],
    platforms: Array.isArray(r.platforms) ? r.platforms.map(String) : [],
    currentPlatform: r.current_platform ?? undefined,
    metacritic: r.metacritic ?? undefined,
    status: r.status as any,
    rating: r.rating ?? undefined,
    ratingNote: r.rating_note ?? undefined,
    targetHours: r.target_hours ?? undefined,
    hltb: r.hltb ?? undefined,
    pricePaid: r.price_paid ?? undefined,
    purchasedAtISO: r.purchased_at_iso ?? undefined,
    sessions: sessionsByGameId.get(String(r.id)) ?? [],
    createdAtISO: String(r.created_at),
    updatedAtISO: String(r.updated_at),
  }));

  const listGamesByListId = new Map<string, string[]>();
  for (const r of (listGames ?? []) as any as DbListGameRow[]) {
    const arr = listGamesByListId.get(String(r.list_id)) ?? [];
    arr.push(String(r.game_id));
    listGamesByListId.set(String(r.list_id), arr);
  }

  const listsOut: GameList[] = ((lists ?? []) as any as DbListRow[]).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    gameIds: listGamesByListId.get(String(r.id)) ?? [],
    createdAtISO: String(r.created_at),
    updatedAtISO: String(r.updated_at),
  }));

  const achievementsOut: AchievementUnlock[] = ((achievements ?? []) as any as DbAchievementRow[]).map((r) => ({
    id: String(r.achievement_id),
    unlockedAtISO: String(r.unlocked_at),
  }));

  gamesOut.sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO));
  listsOut.sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO));
  achievementsOut.sort((a, b) => a.unlockedAtISO.localeCompare(b.unlockedAtISO));

  return { games: gamesOut, lists: listsOut, achievementsUnlocked: achievementsOut };
}

export async function seedFromLocal(userId: string, input: { games: GameEntry[]; lists: GameList[]; achievementsUnlocked: AchievementUnlock[] }) {
  const gameRows: DbGameRow[] = input.games.map((g) => ({
    user_id: userId,
    id: g.id,
    rawg_id: g.rawgId ?? null,
    title: g.title,
    cover_url: g.coverUrl ?? null,
    description: g.description ?? null,
    released: g.released ?? null,
    genres: g.genres ?? [],
    platforms: g.platforms ?? [],
    current_platform: g.currentPlatform ?? null,
    metacritic: g.metacritic ?? null,
    status: g.status,
    rating: g.rating ?? null,
    rating_note: g.ratingNote ?? null,
    target_hours: g.targetHours ?? null,
    hltb: (g as any).hltb ?? null,
    price_paid: g.pricePaid ?? null,
    purchased_at_iso: g.purchasedAtISO ?? null,
    created_at: g.createdAtISO,
    updated_at: g.updatedAtISO,
  }));

  const listRows: DbListRow[] = input.lists.map((l) => ({
    user_id: userId,
    id: l.id,
    name: l.name,
    created_at: l.createdAtISO,
    updated_at: l.updatedAtISO,
  }));

  const listGameRows: DbListGameRow[] = input.lists.flatMap((l) => l.gameIds.map((gameId) => ({ user_id: userId, list_id: l.id, game_id: gameId })));

  const sessionRows: DbSessionRow[] = input.games.flatMap((g) =>
    (g.sessions ?? []).map((s) => ({
      user_id: userId,
      id: s.id,
      game_id: g.id,
      created_at: s.createdAtISO,
      minutes: s.minutes,
      note: s.note ?? null,
    })),
  );

  const achievementRows: DbAchievementRow[] = input.achievementsUnlocked.map((a) => ({
    user_id: userId,
    achievement_id: a.id,
    unlocked_at: a.unlockedAtISO,
  }));

  if (gameRows.length) {
    const { error } = await supabase.from('games').upsert(gameRows, { onConflict: 'user_id,id' });
    if (error) throw error;
  }
  if (listRows.length) {
    const { error } = await supabase.from('lists').upsert(listRows, { onConflict: 'user_id,id' });
    if (error) throw error;
  }
  if (listGameRows.length) {
    const { error } = await supabase.from('list_games').upsert(listGameRows, { onConflict: 'user_id,list_id,game_id' });
    if (error) throw error;
  }
  if (sessionRows.length) {
    const { error } = await supabase.from('sessions').upsert(sessionRows, { onConflict: 'user_id,id' });
    if (error) throw error;
  }
  if (achievementRows.length) {
    const { error } = await supabase.from('achievements_unlocked').upsert(achievementRows, { onConflict: 'user_id,achievement_id' });
    if (error) throw error;
  }
}

export async function applySyncEvent(
  userId: string,
  event:
    | { type: 'GAME_UPSERT'; game: GameEntry }
    | { type: 'GAME_DELETE'; gameId: string }
    | { type: 'LIST_UPSERT'; list: GameList }
    | { type: 'LIST_DELETE'; listId: string }
    | { type: 'LIST_SET_GAMES'; list: GameList }
    | { type: 'SESSION_UPSERT'; gameId: string; session: GameSession }
    | { type: 'SESSION_DELETE'; gameId: string; sessionId: string }
    | { type: 'ACHIEVEMENT_UPSERT'; unlock: AchievementUnlock },
) {
  switch (event.type) {
    case 'GAME_UPSERT': {
      const g = event.game;
      const row: DbGameRow = {
        user_id: userId,
        id: g.id,
        rawg_id: g.rawgId ?? null,
        title: g.title,
        cover_url: g.coverUrl ?? null,
        description: g.description ?? null,
        released: g.released ?? null,
        genres: g.genres ?? [],
        platforms: g.platforms ?? [],
        current_platform: g.currentPlatform ?? null,
        metacritic: g.metacritic ?? null,
        status: g.status,
        rating: g.rating ?? null,
        rating_note: g.ratingNote ?? null,
        target_hours: g.targetHours ?? null,
        hltb: (g as any).hltb ?? null,
        price_paid: g.pricePaid ?? null,
        purchased_at_iso: g.purchasedAtISO ?? null,
        created_at: g.createdAtISO,
        updated_at: g.updatedAtISO,
      };
      const { error } = await supabase.from('games').upsert(row, { onConflict: 'user_id,id' });
      if (error) throw error;
      return;
    }
    case 'GAME_DELETE': {
      const { error } = await supabase.from('games').delete().eq('user_id', userId).eq('id', event.gameId);
      if (error) throw error;
      return;
    }
    case 'LIST_UPSERT': {
      const l = event.list;
      const row: DbListRow = { user_id: userId, id: l.id, name: l.name, created_at: l.createdAtISO, updated_at: l.updatedAtISO };
      const { error } = await supabase.from('lists').upsert(row, { onConflict: 'user_id,id' });
      if (error) throw error;
      return;
    }
    case 'LIST_DELETE': {
      const { error } = await supabase.from('lists').delete().eq('user_id', userId).eq('id', event.listId);
      if (error) throw error;
      return;
    }
    case 'LIST_SET_GAMES': {
      const l = event.list;
      const { error: delErr } = await supabase.from('list_games').delete().eq('user_id', userId).eq('list_id', l.id);
      if (delErr) throw delErr;
      const rows: DbListGameRow[] = (l.gameIds ?? []).map((gameId) => ({ user_id: userId, list_id: l.id, game_id: gameId }));
      if (rows.length) {
        const { error: upErr } = await supabase.from('list_games').upsert(rows, { onConflict: 'user_id,list_id,game_id' });
        if (upErr) throw upErr;
      }
      return;
    }
    case 'SESSION_UPSERT': {
      const s = event.session;
      const row: DbSessionRow = {
        user_id: userId,
        id: s.id,
        game_id: event.gameId,
        created_at: s.createdAtISO,
        minutes: s.minutes,
        note: s.note ?? null,
      };
      const { error } = await supabase.from('sessions').upsert(row, { onConflict: 'user_id,id' });
      if (error) throw error;
      return;
    }
    case 'SESSION_DELETE': {
      const { error } = await supabase.from('sessions').delete().eq('user_id', userId).eq('id', event.sessionId);
      if (error) throw error;
      return;
    }
    case 'ACHIEVEMENT_UPSERT': {
      const a = event.unlock;
      const row: DbAchievementRow = { user_id: userId, achievement_id: a.id, unlocked_at: a.unlockedAtISO };
      const { error } = await supabase.from('achievements_unlocked').upsert(row, { onConflict: 'user_id,achievement_id' });
      if (error) throw error;
      return;
    }
  }
}
