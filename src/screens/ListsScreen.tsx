import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card } from '../components/Card';
import { ThemedButton } from '../components/ThemedButton';
import { ThemedText } from '../components/ThemedText';
import { TextField } from '../components/TextField';
import { Colors } from '../theme/colors';
import { Metrics } from '../theme/metrics';
import { useGameStore } from '../store/GameStore';

type ListsStackParamList = {
  Lists: undefined;
  ListDetail: { listId: string };
  GameDetail: { gameId: string };
  LogSession: { gameId: string };
};

type Props = NativeStackScreenProps<ListsStackParamList, 'Lists'>;

export function ListsScreen({ navigation }: Props) {
  const { state, actions } = useGameStore();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>();

  const lists = state.lists;

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of lists) map.set(l.id, l.gameIds.length);
    return map;
  }, [lists]);

  function onCreate() {
    const v = name.trim();
    if (!v) {
      setError('Informe um nome para a lista.');
      return;
    }
    actions.createList(v);
    setName('');
    setError(undefined);
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={lists}
        keyExtractor={(l) => l.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Card style={styles.card}>
            <ThemedText variant="subtitle">Listas personalizadas</ThemedText>
            <ThemedText variant="muted" style={{ marginTop: 8 }}>
              Crie coleções como “Co-op no sofá”, “Indies relaxantes”, “Halloween”, etc.
            </ThemedText>
            <View style={{ height: 14 }} />
            <TextField
              label="Nova lista"
              value={name}
              onChangeText={(t) => {
                setName(t);
                setError(undefined);
              }}
              placeholder="Ex.: Co-op para jogar no sofá"
              error={error}
            />
            <View style={{ height: 12 }} />
            <ThemedButton label="CRIAR LISTA" onPress={onCreate} />
          </Card>
        }
        ListEmptyComponent={
          <Card style={styles.card}>
            <ThemedText variant="subtitle">Nenhuma lista ainda</ThemedText>
            <ThemedText variant="muted" style={{ marginTop: 8 }}>
              Crie sua primeira lista acima.
            </ThemedText>
          </Card>
        }
        renderItem={({ item }) => {
          const count = counts.get(item.id) ?? 0;
          return (
            <Pressable onPress={() => navigation.navigate('ListDetail', { listId: item.id })}>
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="subtitle" numberOfLines={1}>
                      {item.name}
                    </ThemedText>
                    <ThemedText variant="muted" style={{ marginTop: 6 }}>
                      {count} jogo{count === 1 ? '' : 's'}
                    </ThemedText>
                  </View>
                  <ThemedButton
                    label="EXCLUIR"
                    variant="danger"
                    style={styles.smallDanger}
                    onPress={() =>
                      Alert.alert('Excluir lista', `Deseja excluir "${item.name}"?`, [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Excluir', style: 'destructive', onPress: () => actions.deleteList(item.id) },
                      ])
                    }
                  />
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
    backgroundColor: Colors.bg,
  },
  list: {
    padding: Metrics.pad,
    gap: Metrics.gap,
    paddingBottom: 32,
  },
  card: {
    padding: Metrics.pad,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  smallDanger: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
});
