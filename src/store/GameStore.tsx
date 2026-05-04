import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type {
  AchievementUnlock,
  AppState,
  AuthUser,
  GameEntry,
  GameList,
  GameSession,
  GameStatus,
  HltbTimes,
  SyncEvent,
} from '../types/game';
import { getJson, setJson } from '../storage/jsonStorage';
import { makeId } from '../utils/id';
import { nowISO } from '../utils/time';
import { clampRating } from '../utils/validation';
import { Colors } from '../theme/colors';
import { getAchievementById, getUnlockedAchievementIds } from '../features/achievements';
import { notifyAchievementUnlocked } from '../notifications/achievementNotifications';
import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import { hasSupabaseConfig, supabase } from '../api/supabase';
import { applySyncEvent, getProfileUsername, isUsernameAvailable, pullAll, seedFromLocal, upsertProfile } from '../api/supabaseSync';

const STORAGE_KEY = '@backlog_gamer_state_v1';

type Action =
  | { type: 'HYDRATE'; state: AppState }
  | { type: 'SIGN_IN'; user: AuthUser }
  | { type: 'SIGN_OUT' }
  | { type: 'SET_AUTH_USER'; user: AuthUser | undefined }
  | { type: 'SET_API_KEY'; apiKey: string | undefined }
  | { type: 'SET_HLTB_BASE_URL'; hltbBaseUrl: string | undefined }
  | { type: 'ADD_GAME'; game: GameEntry }
  | { type: 'DELETE_GAME'; gameId: string }
  | { type: 'SET_STATUS'; gameId: string; status: GameStatus }
  | { type: 'SET_RATING'; gameId: string; rating: number | undefined }
  | { type: 'SET_RATING_NOTE'; gameId: string; ratingNote: string | undefined }
  | { type: 'SET_CURRENT_PLATFORM'; gameId: string; currentPlatform: string | undefined }
  | { type: 'SET_TARGET_HOURS'; gameId: string; targetHours: number | undefined }
  | { type: 'SET_PRICE_PAID'; gameId: string; pricePaid: number | undefined }
  | { type: 'SET_PURCHASED_AT'; gameId: string; purchasedAtISO: string | undefined }
  | { type: 'SET_HLTB_TIMES'; gameId: string; hltb: HltbTimes | undefined }
  | { type: 'ADD_SESSION'; gameId: string; minutes: number; note?: string }
  | { type: 'DELETE_SESSION'; gameId: string; sessionId: string }
  | { type: 'CREATE_LIST'; name: string }
  | { type: 'RENAME_LIST'; listId: string; name: string }
  | { type: 'DELETE_LIST'; listId: string }
  | { type: 'ADD_GAME_TO_LIST'; listId: string; gameId: string }
  | { type: 'REMOVE_GAME_FROM_LIST'; listId: string; gameId: string }
  | { type: 'UNLOCK_ACHIEVEMENTS'; unlocks: AchievementUnlock[] }
  | { type: 'SET_SYNC_OUTBOX'; outbox: SyncEvent[] }
  | { type: 'CLEAR_SYNC_OUTBOX' }
  | { type: 'RESET' };

const initialState: AppState = {
  auth: { currentUser: undefined, accounts: [] },
  settings: { rawgApiKey: getDefaultRawgApiKey(), hltbBaseUrl: undefined },
  games: [],
  lists: [],
  achievementsUnlocked: [],
  syncOutbox: [],
};

function reducer(state: AppState, action: Action): AppState {
  const createdAtISO = nowISO();
  switch (action.type) {
    case 'HYDRATE':
      return action.state;
    case 'SIGN_IN':
      return { ...state, auth: { ...(state.auth ?? { accounts: [] }), currentUser: action.user } };
    case 'SIGN_OUT':
      return { ...state, auth: { ...(state.auth ?? { accounts: [] }), currentUser: undefined } };
    case 'SET_AUTH_USER':
      return { ...state, auth: { ...(state.auth ?? { accounts: [] }), currentUser: action.user } };
    case 'SET_API_KEY':
      return { ...state, settings: { ...state.settings, rawgApiKey: action.apiKey } };
    case 'SET_HLTB_BASE_URL':
      return { ...state, settings: { ...state.settings, hltbBaseUrl: action.hltbBaseUrl } };
    case 'ADD_GAME': {
      const exists = state.games.some(
        (g) => g.rawgId != null && action.game.rawgId != null && g.rawgId === action.game.rawgId,
      );
      if (exists) return state;
      const next: AppState = { ...state, games: [action.game, ...state.games] };
      return enqueueSync(next, { id: makeId('sync'), createdAtISO, type: 'GAME_ADD', game: action.game });
    }
    case 'DELETE_GAME':
      return enqueueSync(
        {
        ...state,
        games: state.games.filter((g) => g.id !== action.gameId),
        lists: state.lists.map((l) => {
          const next = l.gameIds.filter((id) => id !== action.gameId);
          if (next.length === l.gameIds.length) return l;
          return { ...l, gameIds: next, updatedAtISO: nowISO() };
        }),
        },
        { id: makeId('sync'), createdAtISO, type: 'GAME_DELETE', gameId: action.gameId }
      );
    case 'SET_STATUS':
      return updateGameWithSync(state, action.gameId, { status: action.status }, action);
    case 'SET_RATING':
      return updateGameWithSync(state, action.gameId, { rating: clampRating(action.rating) }, action);
    case 'SET_RATING_NOTE':
      return updateGameWithSync(state, action.gameId, { ratingNote: action.ratingNote }, action);
    case 'SET_CURRENT_PLATFORM':
      return updateGameWithSync(state, action.gameId, { currentPlatform: action.currentPlatform }, action);
    case 'SET_TARGET_HOURS':
      return updateGameWithSync(state, action.gameId, { targetHours: action.targetHours }, action);
    case 'SET_PRICE_PAID':
      return updateGameWithSync(state, action.gameId, { pricePaid: action.pricePaid }, action);
    case 'SET_PURCHASED_AT':
      return updateGameWithSync(state, action.gameId, { purchasedAtISO: action.purchasedAtISO }, action);
    case 'SET_HLTB_TIMES':
      return updateGameWithSync(state, action.gameId, { hltb: action.hltb }, action);
    case 'ADD_SESSION': {
      const session: GameSession = {
        id: makeId('session'),
        createdAtISO: nowISO(),
        minutes: action.minutes,
        note: action.note?.trim() || undefined,
      };
      const next = updateGame(state, action.gameId, (g) => ({ ...g, sessions: [session, ...g.sessions] }));
      return enqueueSync(next, {
        id: makeId('sync'),
        createdAtISO,
        type: 'SESSION_ADD',
        gameId: action.gameId,
        sessionId: session.id,
        minutes: action.minutes,
        note: action.note?.trim() || undefined,
      });
    }
    case 'DELETE_SESSION':
      return enqueueSync(
        updateGame(state, action.gameId, (g) => ({
          ...g,
          sessions: g.sessions.filter((s) => s.id !== action.sessionId),
        })),
        { id: makeId('sync'), createdAtISO, type: 'SESSION_DELETE', gameId: action.gameId, sessionId: action.sessionId }
      );
    case 'CREATE_LIST': {
      const name = action.name.trim();
      if (!name) return state;
      const list: GameList = {
        id: makeId('list'),
        name,
        gameIds: [],
        createdAtISO: nowISO(),
        updatedAtISO: nowISO(),
      };
      return enqueueSync({ ...state, lists: [list, ...state.lists] }, { id: makeId('sync'), createdAtISO, type: 'LIST_CREATE', list });
    }
    case 'RENAME_LIST': {
      const name = action.name.trim();
      if (!name) return state;
      return enqueueSync(updateList(state, action.listId, (l) => ({ ...l, name })), {
        id: makeId('sync'),
        createdAtISO,
        type: 'LIST_UPDATE',
        listId: action.listId,
        patch: { name },
      });
    }
    case 'DELETE_LIST':
      return enqueueSync({ ...state, lists: state.lists.filter((l) => l.id !== action.listId) }, { id: makeId('sync'), createdAtISO, type: 'LIST_DELETE', listId: action.listId });
    case 'ADD_GAME_TO_LIST':
      return enqueueSync(
        updateList(state, action.listId, (l) => {
          if (l.gameIds.includes(action.gameId)) return l;
          return { ...l, gameIds: [action.gameId, ...l.gameIds] };
        }),
        { id: makeId('sync'), createdAtISO, type: 'LIST_ADD_GAME', listId: action.listId, gameId: action.gameId }
      );
    case 'REMOVE_GAME_FROM_LIST':
      return enqueueSync(
        updateList(state, action.listId, (l) => ({ ...l, gameIds: l.gameIds.filter((id) => id !== action.gameId) })),
        { id: makeId('sync'), createdAtISO, type: 'LIST_REMOVE_GAME', listId: action.listId, gameId: action.gameId }
      );
    case 'UNLOCK_ACHIEVEMENTS': {
      if (!action.unlocks.length) return state;
      const existing = new Set(state.achievementsUnlocked.map((a) => a.id));
      const toAdd = action.unlocks.filter((u) => !existing.has(u.id));
      if (!toAdd.length) return state;
      let next: AppState = { ...state, achievementsUnlocked: [...state.achievementsUnlocked, ...toAdd] };
      for (const u of toAdd) {
        next = enqueueSync(next, {
          id: makeId('sync'),
          createdAtISO,
          type: 'ACHIEVEMENT_UNLOCK',
          achievementId: u.id,
          unlockedAtISO: u.unlockedAtISO,
        });
      }
      return next;
    }
    case 'SET_SYNC_OUTBOX':
      return { ...state, syncOutbox: action.outbox };
    case 'CLEAR_SYNC_OUTBOX':
      if (!state.syncOutbox.length) return state;
      return { ...state, syncOutbox: [] };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

function enqueueSync(state: AppState, event: SyncEvent) {
  const next = [...(state.syncOutbox ?? []), event];
  const capped = next.length > 400 ? next.slice(next.length - 400) : next;
  return { ...state, syncOutbox: capped };
}

function compactOutbox(outbox: SyncEvent[]) {
  const latestGameUpdateById = new Map<string, SyncEvent>();
  const keep: SyncEvent[] = [];
  for (const e of outbox) {
    if (e.type !== 'GAME_UPDATE') {
      keep.push(e);
      continue;
    }
    latestGameUpdateById.set(e.gameId, e);
  }
  const keepNonGameUpdate = keep.filter((e) => e.type !== 'GAME_UPDATE');
  const updates = Array.from(latestGameUpdateById.values()).sort((a, b) => a.createdAtISO.localeCompare(b.createdAtISO));
  return [...keepNonGameUpdate, ...updates];
}

function updateGameWithSync(state: AppState, gameId: string, patch: Record<string, unknown>, action: Action) {
  const next = updateGame(state, gameId, (g) => ({ ...g, ...patch }));
  if (action.type === 'SET_RATING') {
    if (Object.is((patch as any).rating, (state.games.find((g) => g.id === gameId) as any)?.rating)) return next;
  }
  return enqueueSync(next, { id: makeId('sync'), createdAtISO: nowISO(), type: 'GAME_UPDATE', gameId, patch });
}

function updateGame(state: AppState, gameId: string, map: (g: GameEntry) => GameEntry): AppState {
  const now = nowISO();
  return {
    ...state,
    games: state.games.map((g) => (g.id === gameId ? { ...map(g), updatedAtISO: now } : g)),
  };
}

function updateList(state: AppState, listId: string, map: (l: GameList) => GameList): AppState {
  const now = nowISO();
  return {
    ...state,
    lists: state.lists.map((l) => (l.id === listId ? { ...map(l), updatedAtISO: now } : l)),
  };
}

type Store = {
  state: AppState;
  actions: {
    signUp: (
      username: string,
      email: string,
      password: string,
      confirmPassword: string,
    ) => Promise<{ ok: true; message?: string } | { ok: false; error: string }>;
    signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
    signInWithProvider: (provider: 'google' | 'psn' | 'steam') => Promise<{ ok: true } | { ok: false; error: string }>;
    signUpWithProvider: (
      provider: 'google' | 'psn' | 'steam',
      username: string,
    ) => Promise<{ ok: true } | { ok: false; error: string }>;
    signOut: () => Promise<void>;
    setApiKey: (apiKey: string | undefined) => void;
    setHltbBaseUrl: (hltbBaseUrl: string | undefined) => void;
    addGame: (game: GameEntry) => void;
    deleteGame: (gameId: string) => void;
    setStatus: (gameId: string, status: GameStatus) => void;
    setRating: (gameId: string, rating: number | undefined) => void;
    setRatingNote: (gameId: string, ratingNote: string | undefined) => void;
    setCurrentPlatform: (gameId: string, currentPlatform: string | undefined) => void;
    setTargetHours: (gameId: string, targetHours: number | undefined) => void;
    setPricePaid: (gameId: string, pricePaid: number | undefined) => void;
    setPurchasedAtISO: (gameId: string, purchasedAtISO: string | undefined) => void;
    setHltbTimes: (gameId: string, hltb: HltbTimes | undefined) => void;
    addSession: (gameId: string, minutes: number, note?: string) => void;
    deleteSession: (gameId: string, sessionId: string) => void;
    createList: (name: string) => void;
    renameList: (listId: string, name: string) => void;
    deleteList: (listId: string) => void;
    addGameToList: (listId: string, gameId: string) => void;
    removeGameFromList: (listId: string, gameId: string) => void;
    unlockAchievements: (unlocks: AchievementUnlock[]) => void;
    clearSyncOutbox: () => void;
    reset: () => void;
  };
};

const StoreContext = createContext<Store | undefined>(undefined);

export function GameStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [hydrated, setHydrated] = useState(false);
  const hasHydratedRef = useRef(false);
  const didInitialAchievementsSyncRef = useRef(false);
  const [isOnline, setIsOnline] = useState<boolean | undefined>(undefined);
  const wasOnlineRef = useRef<boolean | undefined>(undefined);
  const cloudInitializedForUserRef = useRef<string | undefined>(undefined);
  const flushingOutboxRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await getJson<AppState>(STORAGE_KEY);
        const next = sanitizeState(stored) ?? initialState;
        if (!cancelled) {
          dispatch({ type: 'HYDRATE', state: next });
          setHydrated(true);
          hasHydratedRef.current = true;
        }
      } catch {
        if (!cancelled) {
          dispatch({ type: 'HYDRATE', state: initialState });
          setHydrated(true);
          hasHydratedRef.current = true;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedRef.current) return;
    setJson(STORAGE_KEY, state).catch(() => {});
  }, [state]);

  useEffect(() => {
    if (!hydrated) return;
    if (!hasSupabaseConfig()) return;
    let cancelled = false;
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (cancelled) return;
        const base = data.session?.user ? authUserFromSupabaseUser(data.session.user) : undefined;
        if (!base) {
          dispatch({ type: 'SET_AUTH_USER', user: undefined });
          return;
        }
        try {
          const profileUsername = await getProfileUsername(base.id);
          const user = profileUsername ? { ...base, username: profileUsername } : base;
          dispatch({ type: 'SET_AUTH_USER', user });
        } catch {
          dispatch({ type: 'SET_AUTH_USER', user: base });
        }
      })
      .catch(() => {});

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        const base = session?.user ? authUserFromSupabaseUser(session.user) : undefined;
        if (!base) {
          dispatch({ type: 'SET_AUTH_USER', user: undefined });
          return;
        }
        try {
          const profileUsername = await getProfileUsername(base.id);
          const user = profileUsername ? { ...base, username: profileUsername } : base;
          dispatch({ type: 'SET_AUTH_USER', user });
        } catch {
          dispatch({ type: 'SET_AUTH_USER', user: base });
        }
      })();
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [hydrated]);

  useEffect(() => {
    const sub = NetInfo.addEventListener((s) => {
      const next = Boolean(s.isConnected && (s.isInternetReachable ?? true));
      setIsOnline(next);
    });
    return () => sub();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (isOnline !== true) return;
    if (!hasSupabaseConfig()) return;
    const userId = state.auth.currentUser?.id;
    if (!userId) return;
    if (cloudInitializedForUserRef.current === userId) return;
    cloudInitializedForUserRef.current = userId;
    let cancelled = false;
    void (async () => {
      try {
        const cloud = await pullAll(userId);
        if (cancelled) return;

        const cloudHasData = Boolean(cloud.games.length || cloud.lists.length || cloud.achievementsUnlocked.length);
        const localHasData = Boolean(state.games.length || state.lists.length || state.achievementsUnlocked.length);
        if (!cloudHasData && localHasData) {
          await seedFromLocal(userId, {
            games: state.games,
            lists: state.lists,
            achievementsUnlocked: state.achievementsUnlocked,
          });
          if (cancelled) return;
          const seeded = await pullAll(userId);
          if (cancelled) return;
          dispatch({
            type: 'HYDRATE',
            state: {
              ...state,
              auth: { ...state.auth, currentUser: state.auth.currentUser },
              games: seeded.games,
              lists: seeded.lists,
              achievementsUnlocked: seeded.achievementsUnlocked,
              syncOutbox: state.syncOutbox,
            },
          });
          return;
        }

        dispatch({
          type: 'HYDRATE',
          state: {
            ...state,
            auth: { ...state.auth, currentUser: state.auth.currentUser },
            games: cloud.games.length ? cloud.games : state.games,
            lists: cloud.lists.length ? cloud.lists : state.lists,
            achievementsUnlocked: cloud.achievementsUnlocked.length ? cloud.achievementsUnlocked : state.achievementsUnlocked,
            syncOutbox: state.syncOutbox,
          },
        });
      } catch {
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, isOnline, state.auth.currentUser?.id]);

  useEffect(() => {
    if (!hydrated) return;
    if (isOnline !== true) return;
    if (!hasSupabaseConfig()) return;
    const userId = state.auth.currentUser?.id;
    if (!userId) return;
    if (!state.syncOutbox.length) return;
    if (flushingOutboxRef.current) return;
    flushingOutboxRef.current = true;
    let cancelled = false;
    void (async () => {
      let remaining = state.syncOutbox;
      for (let i = 0; i < state.syncOutbox.length; i++) {
        const e = state.syncOutbox[i];
        try {
          const op = cloudOpFromSyncEvent(e, state);
          if (op) await applySyncEvent(userId, op);
          remaining = state.syncOutbox.slice(i + 1);
        } catch {
          remaining = state.syncOutbox.slice(i);
          break;
        }
      }
      if (!cancelled) {
        dispatch({ type: 'SET_SYNC_OUTBOX', outbox: remaining });
      }
      flushingOutboxRef.current = false;
    })();
    return () => {
      cancelled = true;
      flushingOutboxRef.current = false;
    };
  }, [hydrated, isOnline, state.auth.currentUser?.id, state.syncOutbox]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;
    if (isOnline == null) return;
    const prev = wasOnlineRef.current;
    wasOnlineRef.current = isOnline;
    if (prev === false && isOnline === true) {
      const pending = state.syncOutbox?.length ?? 0;
      if (pending > 0) {
        dispatch({
          type: 'HYDRATE',
          state: { ...state, syncOutbox: compactOutbox(state.syncOutbox ?? []) },
        });
        Notifications.scheduleNotificationAsync({
          content: {
            title: 'Conexão restaurada',
            body: `${pending} ações pendentes para sincronizar no Supabase.`,
            sound: true,
          },
          trigger: null,
        }).catch(() => {});
      }
    }
  }, [isOnline, state]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;
    const unlockedNow = getUnlockedAchievementIds(state);
    const unlockedAlready = new Set(state.achievementsUnlocked.map((a) => a.id));
    const newlyUnlockedIds = unlockedNow.filter((id) => !unlockedAlready.has(id));
    if (!didInitialAchievementsSyncRef.current) {
      didInitialAchievementsSyncRef.current = true;
      if (newlyUnlockedIds.length) {
        const unlocks: AchievementUnlock[] = newlyUnlockedIds.map((id) => ({ id, unlockedAtISO: nowISO() }));
        dispatch({ type: 'UNLOCK_ACHIEVEMENTS', unlocks });
      }
      return;
    }

    if (!newlyUnlockedIds.length) return;

    const unlocks: AchievementUnlock[] = newlyUnlockedIds.map((id) => ({ id, unlockedAtISO: nowISO() }));
    dispatch({ type: 'UNLOCK_ACHIEVEMENTS', unlocks });

    for (const id of newlyUnlockedIds) {
      const achievement = getAchievementById(id);
      if (!achievement) continue;
      notifyAchievementUnlocked(achievement.title, achievement.description);
    }
  }, [state]);

  const store = useMemo<Store>(() => {
    return {
      state,
      actions: {
        signUp: async (username, email, password, confirmPassword) => {
          if (!hasSupabaseConfig()) return { ok: false, error: 'Configure o Supabase (.env) para habilitar login/cadastro.' };
          const normalizedUsername = normalizeUsername(username);
          if (!normalizedUsername) return { ok: false, error: 'Informe um nome de usuário (3 a 20 caracteres).' };
          const normalizedEmail = normalizeEmail(email);
          if (!normalizedEmail) return { ok: false, error: 'Informe um e-mail válido.' };
          const pass = String(password ?? '');
          const confirm = String(confirmPassword ?? '');
          if (pass.length < 6) return { ok: false, error: 'A senha precisa ter pelo menos 6 caracteres.' };
          if (pass !== confirm) return { ok: false, error: 'As senhas não conferem.' };

          try {
            const ok = await isUsernameAvailable(normalizedUsername);
            if (!ok) return { ok: false, error: 'Esse nome de usuário já está em uso.' };
          } catch (e: any) {
            return { ok: false, error: typeof e?.message === 'string' ? e.message : 'Falha ao validar nome de usuário.' };
          }

          const { data, error } = await supabase.auth.signUp({
            email: normalizedEmail,
            password: pass,
            options: { data: { username: normalizedUsername } },
          });
          if (error) return { ok: false, error: error.message };

          const newUserId = data.user?.id ?? data.session?.user?.id;
          if (newUserId) {
            try {
              await upsertProfile(newUserId, normalizedUsername);
            } catch (e: any) {
              return { ok: false, error: typeof e?.message === 'string' ? e.message : 'Falha ao criar perfil no banco.' };
            }
          }

          if (data.session?.user) {
            dispatch({
              type: 'SIGN_IN',
              user: { ...authUserFromSupabaseUser(data.session.user), username: normalizedUsername },
            });
            return { ok: true };
          }

          return { ok: true, message: 'Conta criada. Verifique seu e-mail para confirmar o cadastro e depois faça login.' };
        },
        signIn: async (email, password) => {
          if (!hasSupabaseConfig()) return { ok: false, error: 'Configure o Supabase (.env) para habilitar login.' };
          const normalizedEmail = normalizeEmail(email);
          if (!normalizedEmail) return { ok: false, error: 'Informe um e-mail válido.' };
          const pass = String(password ?? '');
          const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password: pass });
          if (error) return { ok: false, error: error.message };
          if (!data.session?.user) return { ok: false, error: 'Falha ao criar sessão.' };
          const base = authUserFromSupabaseUser(data.session.user);
          try {
            const profileUsername = await getProfileUsername(base.id);
            if (profileUsername) {
              dispatch({ type: 'SIGN_IN', user: { ...base, username: profileUsername } });
            } else if (base.username) {
              await upsertProfile(base.id, base.username);
              dispatch({ type: 'SIGN_IN', user: base });
            } else {
              dispatch({ type: 'SIGN_IN', user: base });
            }
          } catch {
            dispatch({ type: 'SIGN_IN', user: base });
          }
          return { ok: true };
        },
        signInWithProvider: async (provider) => {
          return { ok: false, error: `Login com ${provider.toUpperCase()} ainda não está configurado no Supabase.` };
        },
        signUpWithProvider: async (provider, username) => {
          const normalizedUsername = normalizeUsername(username);
          if (!normalizedUsername) return { ok: false, error: 'Informe um nome de usuário (3 a 20 caracteres).' };
          return { ok: false, error: `Cadastro com ${provider.toUpperCase()} ainda não está configurado no Supabase.` };
        },
        signOut: async () => {
          try {
            if (hasSupabaseConfig()) await supabase.auth.signOut();
          } finally {
            dispatch({ type: 'SIGN_OUT' });
          }
        },
        setApiKey: (apiKey) => dispatch({ type: 'SET_API_KEY', apiKey: apiKey?.trim() || undefined }),
        setHltbBaseUrl: (hltbBaseUrl) =>
          dispatch({ type: 'SET_HLTB_BASE_URL', hltbBaseUrl: hltbBaseUrl?.trim() || undefined }),
        addGame: (game) => dispatch({ type: 'ADD_GAME', game }),
        deleteGame: (gameId) => dispatch({ type: 'DELETE_GAME', gameId }),
        setStatus: (gameId, status) => dispatch({ type: 'SET_STATUS', gameId, status }),
        setRating: (gameId, rating) => dispatch({ type: 'SET_RATING', gameId, rating }),
        setRatingNote: (gameId, ratingNote) =>
          dispatch({ type: 'SET_RATING_NOTE', gameId, ratingNote: ratingNote?.trim() || undefined }),
        setCurrentPlatform: (gameId, currentPlatform) =>
          dispatch({
            type: 'SET_CURRENT_PLATFORM',
            gameId,
            currentPlatform: currentPlatform?.trim() || undefined,
          }),
        setTargetHours: (gameId, targetHours) => dispatch({ type: 'SET_TARGET_HOURS', gameId, targetHours }),
        setPricePaid: (gameId, pricePaid) => dispatch({ type: 'SET_PRICE_PAID', gameId, pricePaid }),
        setPurchasedAtISO: (gameId, purchasedAtISO) =>
          dispatch({ type: 'SET_PURCHASED_AT', gameId, purchasedAtISO: purchasedAtISO?.trim() || undefined }),
        setHltbTimes: (gameId, hltb) => dispatch({ type: 'SET_HLTB_TIMES', gameId, hltb }),
        addSession: (gameId, minutes, note) => dispatch({ type: 'ADD_SESSION', gameId, minutes, note }),
        deleteSession: (gameId, sessionId) => dispatch({ type: 'DELETE_SESSION', gameId, sessionId }),
        createList: (name) => dispatch({ type: 'CREATE_LIST', name }),
        renameList: (listId, name) => dispatch({ type: 'RENAME_LIST', listId, name }),
        deleteList: (listId) => dispatch({ type: 'DELETE_LIST', listId }),
        addGameToList: (listId, gameId) => dispatch({ type: 'ADD_GAME_TO_LIST', listId, gameId }),
        removeGameFromList: (listId, gameId) => dispatch({ type: 'REMOVE_GAME_FROM_LIST', listId, gameId }),
        unlockAchievements: (unlocks) => dispatch({ type: 'UNLOCK_ACHIEVEMENTS', unlocks }),
        clearSyncOutbox: () => dispatch({ type: 'CLEAR_SYNC_OUTBOX' }),
        reset: () => dispatch({ type: 'RESET' }),
      },
    };
  }, [state]);

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.accent2} />
      </View>
    );
  }
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useGameStore() {
  const v = useContext(StoreContext);
  if (!v) throw new Error('useGameStore must be used within GameStoreProvider');
  return v;
}

function authUserFromSupabaseUser(user: SupabaseUser): AuthUser {
  const email = typeof user.email === 'string' ? user.email : undefined;
  const rawProvider = (user as any)?.app_metadata?.provider;
  const provider = normalizeSupabaseProvider(rawProvider);
  const metaUsername = (user as any)?.user_metadata?.username;
  const username =
    typeof metaUsername === 'string' && metaUsername.trim()
      ? metaUsername.trim()
      : email
        ? fallbackUsernameFromEmail(email)
        : 'user';
  return { id: user.id, provider, username, email };
}

function normalizeSupabaseProvider(provider: unknown): AuthUser['provider'] {
  switch (provider) {
    case 'google':
      return 'google';
    case 'steam':
      return 'steam';
    default:
      return 'email';
  }
}

function fallbackUsernameFromEmail(email: string) {
  const v = String(email ?? '').trim();
  const at = v.indexOf('@');
  const local = at > 0 ? v.slice(0, at) : v;
  const cleaned = local.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 20);
  return cleaned.length >= 3 ? cleaned : 'user';
}

function cloudOpFromSyncEvent(event: SyncEvent, state: AppState) {
  switch (event.type) {
    case 'GAME_ADD':
      return { type: 'GAME_UPSERT' as const, game: event.game };
    case 'GAME_UPDATE': {
      const game = state.games.find((g) => g.id === event.gameId);
      if (!game) return null;
      return { type: 'GAME_UPSERT' as const, game };
    }
    case 'GAME_DELETE':
      return { type: 'GAME_DELETE' as const, gameId: event.gameId };
    case 'LIST_CREATE':
      return { type: 'LIST_UPSERT' as const, list: event.list };
    case 'LIST_UPDATE': {
      const list = state.lists.find((l) => l.id === event.listId);
      if (!list) return null;
      return { type: 'LIST_UPSERT' as const, list };
    }
    case 'LIST_DELETE':
      return { type: 'LIST_DELETE' as const, listId: event.listId };
    case 'LIST_ADD_GAME':
    case 'LIST_REMOVE_GAME': {
      const list = state.lists.find((l) => l.id === event.listId);
      if (!list) return null;
      return { type: 'LIST_SET_GAMES' as const, list };
    }
    case 'SESSION_ADD': {
      const game = state.games.find((g) => g.id === event.gameId);
      const rawSessionId = (event as any).sessionId;
      const sessionId = typeof rawSessionId === 'string' ? rawSessionId : undefined;
      const session =
        (sessionId ? game?.sessions.find((s) => s.id === sessionId) : undefined) ??
        game?.sessions.find((s) => s.createdAtISO === event.createdAtISO && s.minutes === event.minutes && (s.note ?? '') === (event.note ?? ''));
      if (!game || !session) return null;
      return { type: 'SESSION_UPSERT' as const, gameId: game.id, session };
    }
    case 'SESSION_DELETE':
      return { type: 'SESSION_DELETE' as const, gameId: event.gameId, sessionId: event.sessionId };
    case 'ACHIEVEMENT_UNLOCK':
      return { type: 'ACHIEVEMENT_UPSERT' as const, unlock: { id: event.achievementId, unlockedAtISO: event.unlockedAtISO } };
  }
}

function sanitizeState(state: AppState | undefined) {
  if (!state) return undefined;

  const cu = (state as any)?.auth?.currentUser;
  const currentUser =
    cu && typeof cu === 'object' && typeof cu.id === 'string' && typeof cu.username === 'string' && cu.username.trim()
      ? ({
          id: String(cu.id),
          provider: normalizeStoredProvider((cu as any).provider),
          username: String(cu.username).trim(),
          email: typeof (cu as any).email === 'string' ? String((cu as any).email) : undefined,
        } satisfies AuthUser)
      : undefined;

  const games = Array.isArray(state.games) ? state.games : [];
  const safeGames = games
    .filter((g): g is GameEntry => Boolean(g && typeof g.id === 'string' && typeof g.title === 'string'))
    .map((g) => ({
      ...g,
      genres: Array.isArray(g.genres) ? g.genres : [],
      platforms: Array.isArray(g.platforms) ? g.platforms : [],
      sessions: Array.isArray(g.sessions) ? g.sessions : [],
      status: migrateStatus(g.status as any),
      ratingNote: typeof (g as any).ratingNote === 'string' ? (g as any).ratingNote : undefined,
      currentPlatform:
        typeof (g as any).currentPlatform === 'string' ? (g as any).currentPlatform : undefined,
      pricePaid: Number.isFinite((g as any).pricePaid) ? Number((g as any).pricePaid) : undefined,
      purchasedAtISO: typeof (g as any).purchasedAtISO === 'string' ? (g as any).purchasedAtISO : undefined,
      hltb: sanitizeHltb((g as any).hltb),
    }));
  const rawgApiKey = state.settings?.rawgApiKey ?? getDefaultRawgApiKey();
  const hltbBaseUrl =
    typeof (state.settings as any)?.hltbBaseUrl === 'string' ? String((state.settings as any).hltbBaseUrl) : undefined;

  const lists = Array.isArray((state as any).lists) ? ((state as any).lists as any[]) : [];
  const safeLists = lists
    .filter((l) => Boolean(l && typeof l.id === 'string' && typeof l.name === 'string'))
    .map((l) => ({
      id: String(l.id),
      name: String(l.name),
      gameIds: Array.isArray(l.gameIds) ? l.gameIds.filter((id: any) => typeof id === 'string') : [],
      createdAtISO: typeof l.createdAtISO === 'string' ? l.createdAtISO : nowISO(),
      updatedAtISO: typeof l.updatedAtISO === 'string' ? l.updatedAtISO : nowISO(),
    }));

  const achievementsUnlocked = Array.isArray((state as any).achievementsUnlocked)
    ? ((state as any).achievementsUnlocked as any[])
        .filter((a) => Boolean(a && typeof a.id === 'string'))
        .map((a) => ({
          id: String(a.id),
          unlockedAtISO: typeof a.unlockedAtISO === 'string' ? a.unlockedAtISO : nowISO(),
        }))
    : [];

  const syncOutbox = Array.isArray((state as any).syncOutbox)
    ? ((state as any).syncOutbox as any[])
        .filter((e) => Boolean(e && typeof e.id === 'string' && typeof e.createdAtISO === 'string' && typeof e.type === 'string'))
        .slice(-400)
        .map((e) => e as SyncEvent)
    : [];

  return {
    auth: {
      accounts: [],
      currentUser,
    },
    settings: { ...(state.settings ?? {}), rawgApiKey, hltbBaseUrl },
    games: safeGames,
    lists: safeLists,
    achievementsUnlocked,
    syncOutbox,
  };
}

function normalizeStoredProvider(provider: unknown): AuthUser['provider'] {
  switch (provider) {
    case 'email':
    case 'google':
    case 'psn':
    case 'steam':
      return provider;
    default:
      return 'email';
  }
}

function normalizeEmail(email: string) {
  const v = String(email ?? '').trim();
  if (!v) return undefined;
  const at = v.indexOf('@');
  if (at <= 0 || at >= v.length - 3) return undefined;
  return v;
}

function normalizeUsername(username: string) {
  const v = String(username ?? '').trim();
  if (v.length < 3 || v.length > 20) return undefined;
  const ok = /^[A-Za-z0-9_]+$/.test(v);
  if (!ok) return undefined;
  return v;
}

function sanitizeHltb(input: any): HltbTimes | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const fetchedAtISO = typeof input.fetchedAtISO === 'string' ? input.fetchedAtISO : undefined;
  if (!fetchedAtISO) return undefined;
  const main = Number.isFinite(input.main) ? Number(input.main) : undefined;
  const mainExtra = Number.isFinite(input.mainExtra) ? Number(input.mainExtra) : undefined;
  const completionist = Number.isFinite(input.completionist) ? Number(input.completionist) : undefined;
  const matchTitle = typeof input.matchTitle === 'string' ? input.matchTitle : undefined;
  return { main, mainExtra, completionist, fetchedAtISO, matchTitle };
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function getDefaultRawgApiKey() {
  const key = process.env.EXPO_PUBLIC_RAWG_API_KEY;
  if (!key) return undefined;
  const trimmed = String(key).trim();
  return trimmed ? trimmed : undefined;
}

function migrateStatus(status: unknown): GameStatus {
  if (typeof status !== 'string') return 'backlog';
  switch (status) {
    case 'wishlist':
    case 'backlog':
    case 'playing':
    case 'finished':
    case 'completed_100':
    case 'abandoned':
      return status;
    case 'not_started':
      return 'backlog';
    case 'completed':
      return 'finished';
    default:
      return 'backlog';
  }
}
