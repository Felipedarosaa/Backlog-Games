import React, { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Card } from '../components/Card';
import { ThemedText } from '../components/ThemedText';
import { Colors } from '../theme/colors';
import { Metrics } from '../theme/metrics';
import { useGameStore } from '../store/GameStore';
import {
  ACHIEVEMENTS,
  formatAchievementValue,
  getAchievementProgress,
  type AchievementDefinition,
  type AchievementRarity,
} from '../features/achievements';

export function AchievementsScreen() {
  const {
    state: { achievementsUnlocked, ...state },
  } = useGameStore();

  const unlockedSet = useMemo(() => new Set(achievementsUnlocked.map((a) => a.id)), [achievementsUnlocked]);

  const items = useMemo(() => {
    return ACHIEVEMENTS.map((a) => {
      const unlocked = unlockedSet.has(a.id);
      const progress = getAchievementProgress({ ...state, achievementsUnlocked }, a.id);
      const unlockedAt = achievementsUnlocked.find((u) => u.id === a.id)?.unlockedAtISO;
      return { achievement: a, unlocked, progress, unlockedAt };
    }).sort((x, y) => {
      if (x.unlocked !== y.unlocked) return x.unlocked ? -1 : 1;
      return y.progress.pct - x.progress.pct;
    });
  }, [achievementsUnlocked, state, unlockedSet]);

  const unlockedCount = achievementsUnlocked.length;

  return (
    <View style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.achievement.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Card style={styles.headerCard}>
            <ThemedText variant="subtitle">Conquistas</ThemedText>
            <ThemedText variant="muted" style={{ marginTop: 8 }}>
              Desbloqueadas: {unlockedCount}/{ACHIEVEMENTS.length}
            </ThemedText>
            <View style={{ height: 10 }} />
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.round((unlockedCount / Math.max(1, ACHIEVEMENTS.length)) * 100)}%` },
                ]}
              />
            </View>
          </Card>
        }
        renderItem={({ item }) => {
          const a = item.achievement;
          const rarity = rarityStyle(a.rarity);
          const currentLabel = formatAchievementValue(a.id, item.progress.current);
          const targetLabel = formatAchievementValue(a.id, item.progress.target);

          return (
            <Card style={[styles.achievementCard, { borderColor: rarity.border }]}>
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: rarity.bg }]}>
                  <ThemedText style={styles.iconText}>{a.icon}</ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <ThemedText variant="subtitle" numberOfLines={1}>
                      {a.title}
                    </ThemedText>
                    <View style={[styles.badge, { backgroundColor: rarity.bg, borderColor: rarity.border }]}>
                      <ThemedText variant="label" style={{ color: rarity.text }}>
                        {rarity.label}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText variant="muted" style={{ marginTop: 6 }}>
                    {a.description}
                  </ThemedText>
                </View>
              </View>

              <View style={{ height: 10 }} />
              <View style={styles.progressHeader}>
                <ThemedText variant="label">
                  {currentLabel} / {targetLabel}
                </ThemedText>
                <ThemedText variant="label" style={{ color: item.unlocked ? Colors.success : Colors.textMuted }}>
                  {item.unlocked ? 'DESBLOQUEADA' : `${Math.round(item.progress.pct * 100)}%`}
                </ThemedText>
              </View>
              <View style={{ height: 6 }} />
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    { width: `${Math.round(item.progress.pct * 100)}%` },
                    item.unlocked ? { backgroundColor: Colors.success } : undefined,
                  ]}
                />
              </View>

              {item.unlockedAt ? (
                <ThemedText variant="muted" style={{ marginTop: 8 }}>
                  Desbloqueada em {new Date(item.unlockedAt).toLocaleDateString()}
                </ThemedText>
              ) : null}
            </Card>
          );
        }}
      />
    </View>
  );
}

function rarityStyle(rarity: AchievementRarity) {
  switch (rarity) {
    case 'common':
      return { label: 'Comum', bg: '#243151', border: '#3E4F7C', text: '#C9D5FF' };
    case 'rare':
      return { label: 'Rara', bg: '#1E3A5F', border: '#2D6EA8', text: '#A9DCFF' };
    case 'epic':
      return { label: 'Épica', bg: '#3B2458', border: '#8A5AE2', text: '#E1C9FF' };
    case 'legendary':
      return { label: 'Lendária', bg: '#5E3F0E', border: '#FFB703', text: '#FFE6A4' };
    default:
      return { label: 'Comum', bg: '#243151', border: '#3E4F7C', text: '#C9D5FF' };
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  list: {
    padding: Metrics.pad,
    gap: Metrics.gap,
    paddingBottom: 30,
  },
  headerCard: {
    padding: Metrics.pad,
  },
  achievementCard: {
    padding: Metrics.pad,
    borderWidth: 1.5,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 22,
  },
  titleRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  track: {
    height: 10,
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
});
