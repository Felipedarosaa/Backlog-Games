export type RootTabParamList = {
  LibraryTab: undefined;
  AddTab: undefined;
  DashboardTab: undefined;
  MoreTab: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

export type LibraryStackParamList = {
  Library: undefined;
  Goals: undefined;
  GameDetail: { gameId: string };
  LogSession: { gameId: string };
};

export type AddStackParamList = {
  AddGame: undefined;
};

export type ReviewsStackParamList = {
  Reviews: undefined;
  GameDetail: { gameId: string };
};

export type AchievementsStackParamList = {
  Achievements: undefined;
  GameDetail: { gameId: string };
};

export type MoreStackParamList = {
  MoreHome: undefined;
  Reviews: undefined;
  Achievements: undefined;
  Lists: undefined;
  ListDetail: { listId: string };
  Settings: undefined;
  GameDetail: { gameId: string };
  LogSession: { gameId: string };
};

export type DashboardStackParamList = {
  Dashboard: undefined;
  GameDetail: { gameId: string };
  LogSession: { gameId: string };
};

export type ListsStackParamList = {
  Lists: undefined;
  ListDetail: { listId: string };
  GameDetail: { gameId: string };
  LogSession: { gameId: string };
};

export type SettingsStackParamList = {
  Settings: undefined;
};
