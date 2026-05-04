import React, { useMemo } from 'react';
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ReviewsStackParamList } from '../navigation/types';
import { Card } from '../components/Card';
import { ThemedText } from '../components/ThemedText';
import { Colors } from '../theme/colors';
import { Metrics } from '../theme/metrics';
import { useGameStore } from '../store/GameStore';
import { getTotalMinutes } from '../store/selectors';
import { formatDuration } from '../utils/time';

type Props = NativeStackScreenProps<ReviewsStackParamList, 'Reviews'>;

export function ReviewsScreen({ navigation }: Props) {
  const {
    state: { games },
  } = useGameStore();

  const reviewed = useMemo(() => {
    return games
      .filter((g) => g.rating != null || (g.ratingNote != null && g.ratingNote.trim().length > 0))
      .map((g) => ({ game: g, minutes: getTotalMinutes(g) }))
      .sort((a, b) => (b.game.updatedAtISO ?? '').localeCompare(a.game.updatedAtISO ?? ''));
  }, [games]);

  const summary = useMemo(() => {
    const count = reviewed.length;
    const rated = reviewed.map((x) => x.game.rating).filter((v): v is number => typeof v === 'number');
    const avg = rated.length ? Math.round((rated.reduce((a, b) => a + b, 0) / rated.length) * 10) / 10 : undefined;
    return { count, avg };
  }, [reviewed]);

  return (
    <View style={styles.screen}>
      <FlatList
        data={reviewed}
        keyExtractor={(i) => i.game.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          reviewed.length ? (
            <Card style={styles.headerCard}>
              <ThemedText variant="subtitle">Avaliações</ThemedText>
              <View style={{ height: 10 }} />
              <View style={styles.chipsRow}>
                <InfoChip label={`${summary.count} jogo${summary.count === 1 ? '' : 's'}`} />
                {summary.avg != null ? <InfoChip label={`Média: ${summary.avg}/10`} /> : null}
              </View>
            </Card>
          ) : null
        }
        ListEmptyComponent={
          <Card>
            <ThemedText variant="subtitle">Nenhuma avaliação ainda</ThemedText>
            <ThemedText variant="muted" style={{ marginTop: 8 }}>
              Abra um jogo e preencha a nota e/ou comentário.
            </ThemedText>
          </Card>
        }
        renderItem={({ item }) => {
          const g = item.game;
          return (
            <Pressable onPress={() => navigation.navigate('GameDetail', { gameId: g.id })}>
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.coverWrap}>
                    {g.coverUrl ? (
                      <Image source={{ uri: g.coverUrl }} style={styles.cover} />
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
                      {g.title}
                    </ThemedText>
                    <View style={{ height: 6 }} />
                    <View style={styles.chipsRow}>
                      <InfoChip label={formatDuration(item.minutes)} />
                      {g.rating != null ? <InfoChip label={`${g.rating}/10`} /> : null}
                      {g.currentPlatform ? <InfoChip label={g.currentPlatform} /> : null}
                    </View>
                    {g.ratingNote ? (
                      <ThemedText variant="muted" numberOfLines={3} style={{ marginTop: 6 }}>
                        {g.ratingNote}
                      </ThemedText>
                    ) : null}
                  </View>
                </View>
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
  headerCard: {
    padding: Metrics.pad,
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
  },
});

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
