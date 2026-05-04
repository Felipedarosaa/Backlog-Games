export type GameStatus =
  | 'wishlist'
  | 'backlog'
  | 'playing'
  | 'finished'
  | 'completed_100'
  | 'abandoned';

export type GameSession = {
  id: string;
  createdAtISO: string;
  minutes: number;
  note?: string;
};

export type HltbTimes = {
  main?: number;
  mainExtra?: number;
  completionist?: number;
  fetchedAtISO: string;
  matchTitle?: string;
};

export type GameEntry = {
  id: string;
  rawgId?: number;
  title: string;
  coverUrl?: string;
  description?: string;
  released?: string;
  genres: string[];
  platforms: string[];
  currentPlatform?: string;
  metacritic?: number;
  status: GameStatus;
  rating?: number;
  ratingNote?: string;
  targetHours?: number;
  hltb?: HltbTimes;
  pricePaid?: number;
  purchasedAtISO?: string;
  sessions: GameSession[];
  createdAtISO: string;
  updatedAtISO: string;
};

export type AppSettings = {
  rawgApiKey?: string;
  hltbBaseUrl?: string;
};

export type GameList = {
  id: string;
  name: string;
  gameIds: string[];
  createdAtISO: string;
  updatedAtISO: string;
};

export type AchievementUnlock = {
  id: string;
  unlockedAtISO: string;
};

export type AuthAccount = {
  id: string;
  provider: 'email' | 'google' | 'psn' | 'steam';
  username: string;
  email?: string;
  passwordHash?: string;
  createdAtISO: string;
};

export type AuthUser = {
  id: string;
  provider: 'email' | 'google' | 'psn' | 'steam';
  username: string;
  email?: string;
};

export type AuthState = {
  currentUser?: AuthUser;
  accounts: AuthAccount[];
};

export type SyncEvent =
  | { id: string; createdAtISO: string; type: 'GAME_ADD'; game: GameEntry }
  | { id: string; createdAtISO: string; type: 'GAME_DELETE'; gameId: string }
  | {
      id: string;
      createdAtISO: string;
      type: 'GAME_UPDATE';
      gameId: string;
      patch: Record<string, unknown>;
    }
  | { id: string; createdAtISO: string; type: 'SESSION_ADD'; gameId: string; minutes: number; note?: string }
  | { id: string; createdAtISO: string; type: 'SESSION_DELETE'; gameId: string; sessionId: string }
  | { id: string; createdAtISO: string; type: 'LIST_CREATE'; list: GameList }
  | { id: string; createdAtISO: string; type: 'LIST_UPDATE'; listId: string; patch: Record<string, unknown> }
  | { id: string; createdAtISO: string; type: 'LIST_DELETE'; listId: string }
  | { id: string; createdAtISO: string; type: 'LIST_ADD_GAME'; listId: string; gameId: string }
  | { id: string; createdAtISO: string; type: 'LIST_REMOVE_GAME'; listId: string; gameId: string };

export type AppState = {
  auth: AuthState;
  settings: AppSettings;
  games: GameEntry[];
  lists: GameList[];
  achievementsUnlocked: AchievementUnlock[];
  syncOutbox: SyncEvent[];
};
