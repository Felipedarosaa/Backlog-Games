import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LibraryStackParamList } from '../navigation/types';
import { Card } from '../components/Card';
import { ThemedText } from '../components/ThemedText';
import { Colors } from '../theme/colors';
import { Metrics } from '../theme/metrics';
import { useGameStore } from '../store/GameStore';
import { getProgressRatio, getTotalMinutes } from '../store/selectors';
import { formatHours } from '../utils/time';
import { StatusPill } from '../components/StatusPill';

type Props = NativeStackScreenProps<LibraryStackParamList, 'Goals'>;

export function GoalsScreen({ navigation }: Props) {
  const {
    state: { games },
  } = useGameStore();

  const withGoals = useMemo(() => {
    return games
      .filter((g) => g.targetHours != null && g.targetHours > 0)
      .map((g) => {
        const ratio = getProgressRatio(g) ?? 0;
        return { game: g, ratio };
      })
      .sort((a, b) => b.ratio - a.ratio);
  }, [games]);

  return (
    <View style={styles.screen}>
      <FlatList
        data={withGoals}
        keyExtractor={(i) => i.game.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Card>
            <ThemedText variant="subtitle">Sem metas definidas</ThemedText>
            <ThemedText variant="muted" style={{ marginTop: 8 }}>
              Abra um jogo e defina uma meta de horas para acompanhar seu progresso.
            </ThemedText>
          </Card>
        }
        renderItem={({ item }) => {
          const g = item.game;
          const ratio = getProgressRatio(g) ?? 0;
          const minutes = getTotalMinutes(g);
          const target = g.targetHours ?? 0;
          const currentHours = minutes / 60;
          const pct = Math.round(ratio * 100);
          return (
            <Pressable onPress={() => navigation.navigate('GameDetail', { gameId: g.id })}>
              <Card style={styles.card}>
                <View style={styles.headerRow}>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="subtitle" numberOfLines={2}>
                      {g.title}
                    </ThemedText>
                    <View style={{ height: 8 }} />
                    <StatusPill status={g.status} />
                  </View>
                  <ThemedText variant="label">{pct}%</ThemedText>
                </View>

                <View style={{ height: 12 }} />

                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${pct}%` }]} />
                </View>

                <ThemedText variant="muted" style={{ marginTop: 10 }}>
                  {formatHours(minutes)} / {target} h ({currentHours.toFixed(1)}h)
                </ThemedText>
              </Card>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: Metrics.pad,
    backgroundColor: Colors.bg,
  },
  list: {
    gap: Metrics.gap,
    paddingBottom: 24,
  },
  card: {
    padding: Metrics.padSm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  progressTrack: {
    height: 12,
    backgroundColor: Colors.chip,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent2,
  },
});
