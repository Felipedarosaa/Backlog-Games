import React, { useMemo, useRef, useState } from 'react';
import { Alert, Animated, FlatList, Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LibraryStackParamList } from '../navigation/types';
import { useGameStore } from '../store/GameStore';
import type { GameStatus } from '../types/game';
import { Card } from '../components/Card';
import { ThemedText } from '../components/ThemedText';
import { StatusPill } from '../components/StatusPill';
import { Segmented } from '../components/Segmented';
import { TextField } from '../components/TextField';
import { ThemedButton } from '../components/ThemedButton';
import { Colors } from '../theme/colors';
import { Metrics } from '../theme/metrics';
import { getTotalMinutes } from '../store/selectors';
import { formatBoth, formatDuration } from '../utils/time';

type Props = NativeStackScreenProps<LibraryStackParamList, 'Library'>;

type Filter = 'all' | GameStatus;

export function LibraryScreen({ navigation }: Props) {
  const {
    state: { games },
    actions,
  } = useGameStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('__all__');
  const [genreFilter, setGenreFilter] = useState<string>('__all__');
  const { width } = useWindowDimensions();
  const numColumns = width >= 520 ? 2 : 1;
  const openSwipeRef = useRef<Swipeable | null>(null);

  const summary = useMemo(() => {
    const totalGames = games.length;
    const playing = games.filter((g) => g.status === 'playing').length;
    const finished = games.filter((g) => g.status === 'finished' || g.status === 'completed_100').length;
    const totalMinutes = games.reduce((acc, g) => acc + getTotalMinutes(g), 0);
    return { totalGames, playing, finished, totalMinutes };
  }, [games]);

  const platformOptions = useMemo(() => {
    const set = new Set<string>();
    for (const g of games) {
      if (g.currentPlatform) set.add(g.currentPlatform);
      for (const p of g.platforms ?? []) set.add(p);
    }
    const arr = Array.from(set).sort((a, b) => a.localeCompare(b));
    return [{ key: '__all__', label: 'Plataforma: Todas' }, ...arr.map((p) => ({ key: p, label: p }))];
  }, [games]);

  const genreOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of games) {
      for (const gen of g.genres ?? []) {
        const key = canonicalGenre(gen);
        if (!key) continue;
        if (!map.has(key)) map.set(key, labelForCanonicalGenre(key, gen));
      }
    }
    const arr = Array.from(map.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ key: '__all__', label: 'Gênero: Todos' }, ...arr];
  }, [games]);

  const filtered = useMemo(() => {
    const q = normalizeText(query);
    const pf = platformFilter === '__all__' ? '' : canonicalPlatform(platformFilter);
    const gf = genreFilter === '__all__' ? '' : canonicalGenre(genreFilter);
    return games.filter((g) => {
      if (filter !== 'all' && g.status !== filter) return false;
      if (pf) {
        const currentRaw = g.currentPlatform?.trim();
        if (currentRaw) {
          const current = canonicalPlatform(currentRaw);
          if (current !== pf) return false;
        } else {
          const anyMatch = (g.platforms ?? []).some((p) => canonicalPlatform(p) === pf);
          if (!anyMatch) return false;
        }
      }
      if (gf) {
        const genreMatch = (g.genres ?? []).some((gen) => canonicalGenre(gen) === gf);
        if (!genreMatch) return false;
      }
      if (!q) return true;
      const hay = [
        g.title,
        g.currentPlatform,
        (g.genres ?? []).join(' '),
        (g.platforms ?? []).join(' '),
        g.ratingNote,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [games, filter, platformFilter, genreFilter, query]);

  return (
    <View style={styles.screen}>
      <FlatList
        data={filtered}
        key={numColumns}
        numColumns={numColumns}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        columnWrapperStyle={numColumns > 1 ? styles.col : undefined}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <ThemedText variant="title">Seu Backlog</ThemedText>
              <View style={styles.neonDot} />
            </View>
            <View style={{ height: 8 }} />
            <View style={styles.topRow}>
              <View style={{ flex: 1 }}>
                <TextField
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Buscar por título, plataforma, gênero ou comentário…"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <ThemedButton
                label="METAS"
                variant="secondary"
                style={styles.goalsButton}
                onPress={() => navigation.navigate('Goals')}
              />
            </View>
            <View style={{ height: 8 }} />
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <ThemedText variant="label">Jogos</ThemedText>
                <ThemedText variant="subtitle" style={styles.summaryValue}>
                  {summary.totalGames}
                </ThemedText>
              </View>
              <View style={styles.summaryCard}>
                <ThemedText variant="label">Jogando</ThemedText>
                <ThemedText variant="subtitle" style={styles.summaryValue}>
                  {summary.playing}
                </ThemedText>
              </View>
              <View style={styles.summaryCard}>
                <ThemedText variant="label">Finalizados</ThemedText>
                <ThemedText variant="subtitle" style={styles.summaryValue}>
                  {summary.finished}
                </ThemedText>
              </View>
            </View>
            <View style={{ height: 8 }} />
            <View style={styles.activeFiltersRow}>
              {filter !== 'all' ? <FilterChip label={`Status: ${labelForStatus(filter)}`} /> : null}
              {platformFilter !== '__all__' ? (
                <FilterChip label={`Plataforma: ${platformFilter}`} />
              ) : null}
              {genreFilter !== '__all__' ? <FilterChip label={`Gênero: ${genreFilter}`} /> : null}
              {query.trim() ? <FilterChip label="Busca ativa" /> : null}
              {filter !== 'all' || platformFilter !== '__all__' || genreFilter !== '__all__' || query.trim() ? (
                <ThemedButton
                  label="LIMPAR"
                  variant="secondary"
                  style={styles.clearButton}
                  onPress={() => {
                    setFilter('all');
                    setPlatformFilter('__all__');
                    setGenreFilter('__all__');
                    setQuery('');
                  }}
                />
              ) : null}
            </View>
            <View style={{ height: 8 }} />
            <Segmented
              value={filter}
              options={[
                { key: 'all', label: 'TODOS' },
                { key: 'wishlist', label: 'WISHLIST' },
                { key: 'backlog', label: 'BACKLOG' },
                { key: 'playing', label: 'JOGANDO' },
                { key: 'finished', label: 'FINALIZADO' },
                { key: 'completed_100', label: '100%' },
                { key: 'abandoned', label: 'ABANDONADO' },
              ]}
              onChange={setFilter}
              scrollable
              size="compact"
            />
            <View style={{ height: 8 }} />
            <Segmented
              value={platformFilter}
              options={platformOptions as any}
              onChange={setPlatformFilter}
              scrollable
              size="compact"
            />
            <View style={{ height: 8 }} />
            <Segmented
              value={genreFilter}
              options={genreOptions as any}
              onChange={setGenreFilter}
              scrollable
              size="compact"
            />
            <View style={{ height: 12 }} />
          </View>
        }
        ListEmptyComponent={
          <Card>
            <ThemedText variant="subtitle">Sem jogos ainda</ThemedText>
            <ThemedText variant="muted" style={{ marginTop: 8 }}>
              Vá em “Adicionar” para buscar um título na API e inserir no seu backlog.
            </ThemedText>
          </Card>
        }
        renderItem={({ item }) => {
          const minutes = getTotalMinutes(item);
          return (
            <SwipeableRow
              itemId={item.id}
              title={item.title}
              onOpened={(ref) => {
                if (openSwipeRef.current && openSwipeRef.current !== ref) openSwipeRef.current.close();
                openSwipeRef.current = ref;
              }}
              onDelete={() => {
                Alert.alert('Excluir jogo', `Excluir "${item.title}" do backlog?`, [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Excluir', style: 'destructive', onPress: () => actions.deleteGame(item.id) },
                ]);
              }}
            >
              <Pressable
                onPress={() => navigation.navigate('GameDetail', { gameId: item.id })}
                style={[styles.item, numColumns > 1 ? styles.itemHalf : undefined]}
              >
                <Card style={styles.card}>
                  <View style={styles.row}>
                    <View style={styles.coverWrap}>
                      {item.coverUrl ? (
                        <Image source={{ uri: item.coverUrl }} style={styles.cover} />
                      ) : (
                        <View style={styles.coverFallback}>
                          <ThemedText variant="label" style={{ color: Colors.textMuted }}>
                            NO ART
                          </ThemedText>
                        </View>
                      )}
                    </View>

                    <View style={styles.meta}>
                      <ThemedText variant="subtitle" numberOfLines={2}>
                        {item.title}
                      </ThemedText>
                      <View style={{ height: 8 }} />
                      <StatusPill status={item.status} />
                      <View style={{ height: 10 }} />
                      <View style={styles.chipsRow}>
                        <InfoChip label={formatDuration(minutes)} />
                        {item.currentPlatform ? <InfoChip label={item.currentPlatform} /> : null}
                        {item.rating != null ? <InfoChip label={`${item.rating}/10`} /> : null}
                        {item.status === 'completed_100' ? <InfoChip label="🏆 Platina" /> : null}
                      </View>
                      {item.ratingNote ? (
                        <ThemedText variant="muted" numberOfLines={2}>
                          {item.ratingNote}
                        </ThemedText>
                      ) : null}
                    </View>
                  </View>
                </Card>
              </Pressable>
            </SwipeableRow>
          );
        }}
      />
    </View>
  );
}

function SwipeableRow({
  itemId,
  title,
  onDelete,
  onOpened,
  children,
}: {
  itemId: string;
  title: string;
  onDelete: () => void;
  onOpened: (ref: Swipeable | null) => void;
  children: React.ReactNode;
}) {
  const swipeRef = useRef<Swipeable | null>(null);
  const actionWidth = 118;

  return (
    <Swipeable
      ref={swipeRef}
      friction={2}
      overshootRight={false}
      overshootFriction={10}
      rightThreshold={Math.round(actionWidth * 0.35)}
      onSwipeableOpen={() => onOpened(swipeRef.current)}
      renderRightActions={(progress) => {
        const opacity = progress.interpolate({
          inputRange: [0, 0.25, 1],
          outputRange: [0, 0.6, 1],
          extrapolate: 'clamp',
        });
        const scale = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.96, 1],
          extrapolate: 'clamp',
        });

        return (
          <View style={[swipeStyles.actions, { width: actionWidth }]}>
            <Animated.View style={{ opacity, transform: [{ scale }] }}>
              <Pressable
                onPress={() => {
                  swipeRef.current?.close();
                  onDelete();
                }}
                style={[swipeStyles.delete, { width: actionWidth - 6 }]}
              >
                <ThemedText variant="label" style={swipeStyles.deleteText}>
                  EXCLUIR
                </ThemedText>
                <ThemedText variant="muted" style={swipeStyles.deleteSub} numberOfLines={1}>
                  {title}
                </ThemedText>
              </Pressable>
            </Animated.View>
          </View>
        );
      }}
    >
      {children}
    </Swipeable>
  );
}

const swipeStyles = StyleSheet.create({
  actions: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingLeft: 10,
  },
  delete: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginRight: 2,
    borderRadius: 14,
    backgroundColor: Colors.danger,
    borderWidth: 1,
    borderColor: '#FF8DA0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: '#FFFFFF',
  },
  deleteSub: {
    marginTop: 4,
    fontSize: 10,
    color: '#FFFFFFCC',
  },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: Metrics.pad,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  neonDot: {
    width: 10,
    height: 10,
    borderRadius: 6,
    backgroundColor: Colors.accent2,
    shadowColor: Colors.accent2,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalsButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 10,
  },
  summaryValue: {
    marginTop: 6,
  },
  activeFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  list: {
    gap: Metrics.gap,
    paddingBottom: 24,
  },
  col: {
    gap: Metrics.gap,
  },
  item: {
    flex: 1,
  },
  itemHalf: {
    flexBasis: 0,
  },
  card: {
    padding: Metrics.padSm,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  coverWrap: {
    width: 84,
    height: 84,
    borderRadius: Metrics.radiusSm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface2,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
});

function normalizeText(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function canonicalPlatform(input: string) {
  const v = normalizeText(input);
  if (!v) return '';
  if (v.includes('pc') || v.includes('windows') || v.includes('steam')) return 'pc';
  if (v.includes('playstation') || /^ps\s*\d/.test(v) || /^ps\d/.test(v)) return 'playstation';
  if (v.includes('xbox')) return 'xbox';
  if (v.includes('nintendo') || v.includes('switch')) return 'switch';
  if (v.includes('android') || v.includes('ios') || v.includes('mobile') || v.includes('iphone') || v.includes('ipad'))
    return 'mobile';
  return v;
}

function canonicalGenre(input: string) {
  const v = normalizeText(input);
  if (!v) return '';
  if (v.includes('role-playing') || v.includes('role playing') || v === 'rpg') return 'rpg';
  if (v.includes('action-adventure') || v.includes('action adventure')) return 'action-adventure';
  if (v.includes('first-person shooter') || v === 'fps') return 'fps';
  if (v.includes('third-person shooter') || v === 'tps') return 'tps';
  if (v.includes('shooter')) return 'shooter';
  if (v.includes('adventure')) return 'adventure';
  if (v.includes('action')) return 'action';
  if (v.includes('platformer')) return 'platformer';
  if (v.includes('fighting')) return 'fighting';
  if (v.includes('simulation')) return 'simulation';
  if (v.includes('strategy')) return 'strategy';
  if (v.includes('sports')) return 'sports';
  if (v.includes('racing')) return 'racing';
  if (v.includes('puzzle')) return 'puzzle';
  if (v.includes('indie')) return 'indie';
  return v;
}

function labelForCanonicalGenre(key: string, fallback: string) {
  switch (key) {
    case 'rpg':
      return 'RPG';
    case 'fps':
      return 'FPS';
    case 'tps':
      return 'TPS';
    case 'action-adventure':
      return 'Ação e aventura';
    default:
      return toTitleCase(fallback);
  }
}

function toTitleCase(input: string) {
  const s = input.trim();
  if (!s) return '';
  return s
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function FilterChip({ label }: { label: string }) {
  return (
    <View style={chipStyles.wrap}>
      <ThemedText variant="label" style={chipStyles.text}>
        {label}
      </ThemedText>
    </View>
  );
}

function InfoChip({ label }: { label: string }) {
  return (
    <View style={chipStyles.wrap}>
      <ThemedText variant="label" style={chipStyles.text}>
        {label}
      </ThemedText>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.chip,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  text: {
    fontSize: 12,
    color: Colors.text,
  },
});

function labelForStatus(status: Filter) {
  switch (status) {
    case 'wishlist':
      return 'Wishlist';
    case 'backlog':
      return 'Backlog';
    case 'playing':
      return 'Jogando';
    case 'finished':
      return 'Finalizado';
    case 'completed_100':
      return '100%';
    case 'abandoned':
      return 'Abandonado';
    default:
      return 'Todos';
  }
}
