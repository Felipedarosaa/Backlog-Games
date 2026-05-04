import type { AppState, GameEntry } from '../types/game';

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  target: number;
  getCurrent: (state: AppState) => number;
};

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first_game',
    title: 'Primeiro da fila',
    description: 'Adicione seu primeiro jogo ao backlog.',
    icon: '🎮',
    rarity: 'common',
    target: 1,
    getCurrent: (s) => s.games.length,
  },
  {
    id: 'collector_10',
    title: 'Colecionador',
    description: 'Tenha 10 jogos cadastrados.',
    icon: '🗂️',
    rarity: 'rare',
    target: 10,
    getCurrent: (s) => s.games.length,
  },
  {
    id: 'collector_30',
    title: 'Arsenal gamer',
    description: 'Tenha 30 jogos cadastrados.',
    icon: '🕹️',
    rarity: 'epic',
    target: 30,
    getCurrent: (s) => s.games.length,
  },
  {
    id: 'first_session',
    title: 'Primeira sessão',
    description: 'Registre sua primeira sessão de jogo.',
    icon: '⏱️',
    rarity: 'common',
    target: 1,
    getCurrent: (s) => countSessions(s.games),
  },
  {
    id: 'session_marathon',
    title: 'Maratonista',
    description: 'Registre 100 sessões.',
    icon: '🏁',
    rarity: 'epic',
    target: 100,
    getCurrent: (s) => countSessions(s.games),
  },
  {
    id: 'hour_10',
    title: '10 horas de foco',
    description: 'Acumule 10 horas jogadas.',
    icon: '⌛',
    rarity: 'common',
    target: 10 * 60,
    getCurrent: (s) => totalPositiveMinutes(s.games),
  },
  {
    id: 'hour_100',
    title: '100 horas',
    description: 'Acumule 100 horas jogadas.',
    icon: '🔥',
    rarity: 'epic',
    target: 100 * 60,
    getCurrent: (s) => totalPositiveMinutes(s.games),
  },
  {
    id: 'hour_500',
    title: 'Lenda do controle',
    description: 'Acumule 500 horas jogadas.',
    icon: '👑',
    rarity: 'legendary',
    target: 500 * 60,
    getCurrent: (s) => totalPositiveMinutes(s.games),
  },
  {
    id: 'first_finish',
    title: 'GG!',
    description: 'Finalize seu primeiro jogo.',
    icon: '🏆',
    rarity: 'common',
    target: 1,
    getCurrent: (s) => finishedGames(s.games),
  },
  {
    id: 'finish_10',
    title: 'Finalizador',
    description: 'Finalize 10 jogos.',
    icon: '🥇',
    rarity: 'epic',
    target: 10,
    getCurrent: (s) => finishedGames(s.games),
  },
  {
    id: 'platinum_3',
    title: 'Caçador de troféus',
    description: 'Platine (100%) 3 jogos.',
    icon: '💎',
    rarity: 'legendary',
    target: 3,
    getCurrent: (s) => s.games.filter((g) => g.status === 'completed_100').length,
  },
  {
    id: 'critic_10',
    title: 'Crítico de backlog',
    description: 'Avalie 10 jogos com nota.',
    icon: '⭐',
    rarity: 'rare',
    target: 10,
    getCurrent: (s) => s.games.filter((g) => g.rating != null).length,
  },
  {
    id: 'reviewer_10',
    title: 'Resenhista',
    description: 'Escreva comentário em 10 jogos.',
    icon: '📝',
    rarity: 'rare',
    target: 10,
    getCurrent: (s) => s.games.filter((g) => (g.ratingNote ?? '').trim().length > 0).length,
  },
  {
    id: 'organized_5_lists',
    title: 'Organização máxima',
    description: 'Crie 5 listas personalizadas.',
    icon: '📚',
    rarity: 'rare',
    target: 5,
    getCurrent: (s) => s.lists.length,
  },
  {
    id: 'long_session',
    title: 'Sessão insana',
    description: 'Registre uma sessão de pelo menos 6 horas.',
    icon: '🌙',
    rarity: 'epic',
    target: 6 * 60,
    getCurrent: (s) => longestPositiveSession(s.games),
  },
  {
    id: 'playing_now',
    title: 'Em atividade',
    description: 'Tenha 3 jogos com status "Jogando".',
    icon: '🎯',
    rarity: 'rare',
    target: 3,
    getCurrent: (s) => statusCount(s.games, 'playing'),
  },
  {
    id: 'wishlist_20',
    title: 'Sonhador',
    description: 'Tenha 20 jogos na wishlist.',
    icon: '💭',
    rarity: 'rare',
    target: 20,
    getCurrent: (s) => statusCount(s.games, 'wishlist'),
  },
  {
    id: 'backlog_50',
    title: 'Montanha de backlog',
    description: 'Tenha 50 jogos no backlog.',
    icon: '⛰️',
    rarity: 'legendary',
    target: 50,
    getCurrent: (s) => statusCount(s.games, 'backlog'),
  },
  {
    id: 'platforms_5',
    title: 'Multiplataforma',
    description: 'Jogue em pelo menos 5 plataformas diferentes.',
    icon: '🧩',
    rarity: 'epic',
    target: 5,
    getCurrent: (s) => distinctPlatformsCount(s.games),
  },
  {
    id: 'genres_8',
    title: 'Gamer eclético',
    description: 'Tenha jogos em 8 gêneros diferentes.',
    icon: '🎨',
    rarity: 'epic',
    target: 8,
    getCurrent: (s) => distinctGenresCount(s.games),
  },
  {
    id: 'goals_10',
    title: 'Planejador',
    description: 'Defina meta de horas para 10 jogos.',
    icon: '📈',
    rarity: 'rare',
    target: 10,
    getCurrent: (s) => s.games.filter((g) => (g.targetHours ?? 0) > 0).length,
  },
  {
    id: 'hltb_10',
    title: 'Estratégia perfeita',
    description: 'Busque estimativa HLTB para 10 jogos.',
    icon: '🧠',
    rarity: 'rare',
    target: 10,
    getCurrent: (s) => s.games.filter((g) => g.hltb != null).length,
  },
  {
    id: 'detailed_sessions_30',
    title: 'Diário de jogatina',
    description: 'Registre 30 sessões com nota.',
    icon: '📓',
    rarity: 'epic',
    target: 30,
    getCurrent: (s) => sessionsWithNote(s.games),
  },
  {
    id: 'all_rated_20',
    title: 'Curador',
    description: 'Avalie 20 jogos com nota e comentário.',
    icon: '🧪',
    rarity: 'legendary',
    target: 20,
    getCurrent: (s) =>
      s.games.filter((g) => g.rating != null && (g.ratingNote ?? '').trim().length > 0).length,
  },
  {
    id: 'finance_500',
    title: 'Investidor gamer',
    description: 'Registre R$ 500 em compras de jogos.',
    icon: '💸',
    rarity: 'rare',
    target: 500,
    getCurrent: (s) => totalSpent(s.games),
  },
  {
    id: 'finance_2000',
    title: 'Magnata dos games',
    description: 'Registre R$ 2.000 em compras de jogos.',
    icon: '🏦',
    rarity: 'legendary',
    target: 2000,
    getCurrent: (s) => totalSpent(s.games),
  },
  {
    id: 'collections_20',
    title: 'Bibliotecário',
    description: 'Adicione 20 jogos em listas personalizadas.',
    icon: '🗃️',
    rarity: 'epic',
    target: 20,
    getCurrent: (s) => uniqueGamesInLists(s),
  },
];

export function getUnlockedAchievementIds(state: AppState) {
  return ACHIEVEMENTS.filter((a) => a.getCurrent(state) >= a.target).map((a) => a.id);
}

export function getAchievementById(id: string) {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

export function getAchievementProgress(state: AppState, id: string) {
  const achievement = getAchievementById(id);
  if (!achievement) return { current: 0, target: 1, pct: 0 };
  const current = achievement.getCurrent(state);
  const target = achievement.target;
  const pct = target <= 0 ? 0 : Math.max(0, Math.min(1, current / target));
  return { current, target, pct };
}

export function formatAchievementValue(achievementId: string, value: number) {
  if (achievementId.startsWith('hour_') || achievementId === 'long_session') {
    const hours = value / 60;
    if (hours >= 10) return `${Math.round(hours)} h`;
    return `${Math.round(hours * 10) / 10} h`;
  }
  if (achievementId.startsWith('finance_')) {
    return `R$ ${Math.round(value)}`;
  }
  return String(Math.round(value));
}

function countSessions(games: GameEntry[]) {
  return games.reduce((acc, g) => acc + (g.sessions?.length ?? 0), 0);
}

function totalPositiveMinutes(games: GameEntry[]) {
  return games.reduce((acc, g) => {
    const gamePositive = (g.sessions ?? []).reduce((sum, s) => sum + Math.max(0, Number(s.minutes) || 0), 0);
    return acc + gamePositive;
  }, 0);
}

function longestPositiveSession(games: GameEntry[]) {
  let max = 0;
  for (const g of games) {
    for (const s of g.sessions ?? []) {
      const m = Number(s.minutes) || 0;
      if (m > max) max = m;
    }
  }
  return max;
}

function finishedGames(games: GameEntry[]) {
  return games.filter((g) => g.status === 'finished' || g.status === 'completed_100').length;
}

function statusCount(games: GameEntry[], status: GameEntry['status']) {
  return games.filter((g) => g.status === status).length;
}

function distinctGenresCount(games: GameEntry[]) {
  const set = new Set<string>();
  for (const g of games) {
    for (const gen of g.genres ?? []) {
      const key = normalize(gen);
      if (key) set.add(key);
    }
  }
  return set.size;
}

function distinctPlatformsCount(games: GameEntry[]) {
  const set = new Set<string>();
  for (const g of games) {
    const current = normalize(g.currentPlatform ?? '');
    if (current) set.add(current);
    for (const p of g.platforms ?? []) {
      const key = normalize(p);
      if (key) set.add(key);
    }
  }
  return set.size;
}

function sessionsWithNote(games: GameEntry[]) {
  let count = 0;
  for (const g of games) {
    for (const s of g.sessions ?? []) {
      if ((s.note ?? '').trim()) count += 1;
    }
  }
  return count;
}

function totalSpent(games: GameEntry[]) {
  return games.reduce((acc, g) => acc + Math.max(0, Number(g.pricePaid) || 0), 0);
}

function uniqueGamesInLists(state: AppState) {
  const set = new Set<string>();
  for (const list of state.lists) {
    for (const id of list.gameIds ?? []) set.add(id);
  }
  return set.size;
}

function normalize(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
