import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MoreStackParamList } from '../navigation/types';
import { Card } from '../components/Card';
import { ThemedText } from '../components/ThemedText';
import { Colors } from '../theme/colors';
import { Metrics } from '../theme/metrics';

type Props = NativeStackScreenProps<MoreStackParamList, 'MoreHome'>;

export function MoreScreen({ navigation }: Props) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <ThemedText variant="subtitle">Mais opções</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 8 }}>
          Itens menos usados ficam aqui para manter o menu inferior mais limpo.
        </ThemedText>
      </Card>

      <Card style={styles.card}>
        <ThemedText variant="label">Social e engajamento</ThemedText>
        <View style={{ height: 10 }} />
        <View style={styles.grid}>
          <FeatureTile
            title="Conquistas"
            subtitle="Progresso gamer"
            icon="🏆"
            onPress={() => navigation.navigate('Achievements')}
          />
          <FeatureTile
            title="Avaliações"
            subtitle="Notas e reviews"
            icon="⭐"
            onPress={() => navigation.navigate('Reviews')}
          />
        </View>
      </Card>

      <Card style={styles.card}>
        <ThemedText variant="label">Organização</ThemedText>
        <View style={{ height: 10 }} />
        <View style={styles.grid}>
          <FeatureTile
            title="Listas"
            subtitle="Coleções personalizadas"
            icon="📚"
            onPress={() => navigation.navigate('Lists')}
          />
          <FeatureTile
            title="Config"
            subtitle="Ajustes do app"
            icon="⚙️"
            onPress={() => navigation.navigate('Settings')}
          />
        </View>
      </Card>
    </ScrollView>
  );
}

function FeatureTile({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed ? styles.tilePressed : undefined]}>
      <ThemedText style={styles.tileIcon}>{icon}</ThemedText>
      <ThemedText variant="label" numberOfLines={1}>
        {title}
      </ThemedText>
      <ThemedText variant="muted" numberOfLines={1} style={{ marginTop: 2 }}>
        {subtitle}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    padding: Metrics.pad,
    gap: Metrics.gap,
    paddingBottom: 30,
  },
  card: {
    padding: Metrics.pad,
  },
  grid: {
    flexDirection: 'row',
    gap: 10,
  },
  tile: {
    flex: 1,
    backgroundColor: '#152540DD',
    borderWidth: 1,
    borderColor: '#3F5F99',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tilePressed: {
    opacity: 0.9,
    transform: [{ translateY: 1 }],
  },
  tileIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
});
