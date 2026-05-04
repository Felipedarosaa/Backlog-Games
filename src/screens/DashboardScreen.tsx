import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DashboardStackParamList } from '../navigation/types';
import { Card } from '../components/Card';
import { ThemedText } from '../components/ThemedText';
import { Colors } from '../theme/colors';
import { Metrics } from '../theme/metrics';
import { useGameStore } from '../store/GameStore';
import { getTotalMinutes } from '../store/selectors';
import { formatDuration } from '../utils/time';

type Props = NativeStackScreenProps<DashboardStackParamList, 'Dashboard'>;

export function DashboardScreen({ navigation }: Props) {
  const {
    state: { games },
  } = useGameStore();

  const year = new Date().getFullYear();

  const stats = useMemo(() => {
    const totalMinutes = games.reduce((acc, g) => acc + getTotalMinutes(g), 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    const finishedThisYear = games.filter((g) => {
      const done = g.status === 'finished' || g.status === 'completed_100';
      if (!done) return false;
      const iso = g.updatedAtISO ?? g.createdAtISO ?? '';
      return iso.startsWith(String(year));
    }).length;

    const platinumsTotal = games.filter((g) => g.status === 'completed_100').length;
    const platinumsThisYear = games.filter((g) => {
      if (g.status !== 'completed_100') return false;
      const iso = g.updatedAtISO ?? g.createdAtISO ?? '';
      return iso.startsWith(String(year));
    }).length;

    const topPlayed = [...games]
      .map((g) => ({ game: g, minutes: getTotalMinutes(g) }))
      .filter((x) => x.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);

    const genreMinutes = new Map<string, number>();
    for (const g of games) {
      const minutes = getTotalMinutes(g);
      if (!minutes) continue;
      const genres = (g.genres ?? []).map(canonicalGenre).filter(Boolean);
      if (!genres.length) continue;
      const share = minutes / genres.length;
      for (const gen of genres) {
        genreMinutes.set(gen, (genreMinutes.get(gen) ?? 0) + share);
      }
    }
    const topGenres = Array.from(genreMinutes.entries())
      .map(([genre, minutes]) => ({ genre, minutes }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 6);

    const spendByMonth = new Array<number>(12).fill(0);
    let spendYear = 0;
    for (const g of games) {
      const price = g.pricePaid;
      const dateISO = g.purchasedAtISO;
      if (price == null || !Number.isFinite(price) || price <= 0) continue;
      if (typeof dateISO !== 'string' || dateISO.length < 7) continue;
      const y = Number(dateISO.slice(0, 4));
      const m = Number(dateISO.slice(5, 7));
      if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) continue;
      if (y !== year) continue;
      spendYear += price;
      spendByMonth[m - 1] += price;
    }
    spendYear = Math.round(spendYear * 100) / 100;

    return { totalMinutes, totalHours, finishedThisYear, platinumsTotal, platinumsThisYear, topPlayed, topGenres, spendByMonth, spendYear };
  }, [games, year]);

  const maxGenre = stats.topGenres.reduce((m, x) => Math.max(m, x.minutes), 0);
  const maxSpend = stats.spendByMonth.reduce((m, x) => Math.max(m, x), 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.summaryGrid}>
        <View style={styles.summaryTile}>
          <ThemedText variant="muted">Total jogado</ThemedText>
          <ThemedText variant="subtitle" style={{ marginTop: 6 }}>
            {formatDuration(stats.totalMinutes)}
          </ThemedText>
          <ThemedText variant="muted" style={{ marginTop: 4 }}>
            {stats.totalHours} h aprox.
          </ThemedText>
        </View>
        <View style={styles.summaryTile}>
          <ThemedText variant="muted">Finalizados ({year})</ThemedText>
          <ThemedText variant="subtitle" style={{ marginTop: 6 }}>
            {stats.finishedThisYear}
          </ThemedText>
          <ThemedText variant="muted" style={{ marginTop: 4 }}>
            Status: Finalizado/100%
          </ThemedText>
        </View>
        <View style={styles.summaryTile}>
          <ThemedText variant="muted">Platinados ({year})</ThemedText>
          <ThemedText variant="subtitle" style={{ marginTop: 6 }}>
            {stats.platinumsThisYear}
          </ThemedText>
          <ThemedText variant="muted" style={{ marginTop: 4 }}>
            Total: {stats.platinumsTotal}
          </ThemedText>
        </View>
        <View style={styles.summaryTile}>
          <ThemedText variant="muted">Gastos ({year})</ThemedText>
          <ThemedText variant="subtitle" style={{ marginTop: 6 }}>
            R$ {stats.spendYear.toFixed(2)}
          </ThemedText>
          <ThemedText variant="muted" style={{ marginTop: 4 }}>
            Somando compras no ano
          </ThemedText>
        </View>
      </View>

      <Card>
        <ThemedText variant="subtitle">Mais jogados</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 8 }}>
          Top 5 por tempo acumulado.
        </ThemedText>
        <View style={{ height: 12 }} />
        {stats.topPlayed.length ? (
          <View style={{ gap: 10 }}>
            {stats.topPlayed.map(({ game, minutes }) => (
              <Pressable key={game.id} onPress={() => navigation.navigate('GameDetail', { gameId: game.id })}>
                <View style={styles.row}>
                  <ThemedText variant="label" style={{ flex: 1 }} numberOfLines={1}>
                    {game.title}
                  </ThemedText>
                  <ThemedText variant="label">{formatDuration(minutes)}</ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <ThemedText variant="muted">Sem tempo registrado ainda.</ThemedText>
        )}
      </Card>

      <Card>
        <ThemedText variant="subtitle">Gêneros mais jogados</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 8 }}>
          Distribui o tempo igualmente entre os gêneros do jogo.
        </ThemedText>
        <View style={{ height: 12 }} />
        {stats.topGenres.length ? (
          <View style={{ gap: 12 }}>
            {stats.topGenres.map((g) => {
              const ratio = maxGenre ? g.minutes / maxGenre : 0;
              return (
                <View key={g.genre} style={{ gap: 6 }}>
                  <View style={styles.row}>
                    <ThemedText variant="label" style={{ flex: 1 }}>
                      {labelForCanonicalGenre(g.genre)}
                    </ThemedText>
                    <ThemedText variant="label">{formatDuration(g.minutes)}</ThemedText>
                  </View>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <ThemedText variant="muted">Sem gêneros com tempo ainda.</ThemedText>
        )}
      </Card>

      <Card>
        <ThemedText variant="subtitle">Gastos no hobby ({year})</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 8 }}>
          Preencha “Preço pago” e “Data de compra” nos detalhes do jogo para aparecer aqui.
        </ThemedText>
        <View style={{ height: 12 }} />
        <ThemedText variant="label">Por mês</ThemedText>
        <View style={{ height: 10 }} />
        <View style={styles.monthGrid}>
          {stats.spendByMonth.map((v, idx) => {
            const ratio = maxSpend ? v / maxSpend : 0;
            return (
              <View key={idx} style={styles.monthCell}>
                <View style={styles.monthTrack}>
                  <View style={[styles.monthFill, { height: `${Math.round(ratio * 100)}%` }]} />
                </View>
                <ThemedText variant="muted" style={styles.monthLabel}>
                  {String(idx + 1).padStart(2, '0')}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </Card>
    </ScrollView>
  );
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

function labelForCanonicalGenre(key: string) {
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
      return toTitleCase(key);
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

function normalizeText(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    padding: Metrics.pad,
    gap: Metrics.gap,
    paddingBottom: 32,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Metrics.gap,
  },
  summaryTile: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    padding: Metrics.pad,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  track: {
    height: 12,
    backgroundColor: Colors.chip,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.accent2,
  },
  monthGrid: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  monthCell: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  monthTrack: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.surface2,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'flex-end',
  },
  monthFill: {
    width: '100%',
    backgroundColor: Colors.accent,
  },
  monthLabel: {
    fontSize: 10,
  },
});

