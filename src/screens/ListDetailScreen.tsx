import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ListsStackParamList } from '../navigation/types';
import { Card } from '../components/Card';
import { ThemedButton } from '../components/ThemedButton';
import { ThemedText } from '../components/ThemedText';
import { TextField } from '../components/TextField';
import { Colors } from '../theme/colors';
import { Metrics } from '../theme/metrics';
import { useGameStore } from '../store/GameStore';
import { getTotalMinutes } from '../store/selectors';
import { formatDuration } from '../utils/time';
import type { GameEntry } from '../types/game';

type Props = NativeStackScreenProps<ListsStackParamList, 'ListDetail'>;

export function ListDetailScreen({ route, navigation }: Props) {
  const { listId } = route.params;
  const { state, actions } = useGameStore();
  const list = useMemo(() => state.lists.find((l) => l.id === listId), [state.lists, listId]);

  const [name, setName] = useState(list?.name ?? '');
  const [nameError, setNameError] = useState<string | undefined>();

  const gamesInList = useMemo<GameEntry[]>(() => {
    if (!list) return [];
    const byId = new Map(state.games.map((g) => [g.id, g]));
    return list.gameIds.map((id) => byId.get(id)).filter(isGameEntry);
  }, [list, state.games]);

  if (!list) {
    return (
      <View style={styles.screen}>
        <Card style={styles.card}>
          <ThemedText variant="subtitle">Lista não encontrada</ThemedText>
          <ThemedText variant="muted" style={{ marginTop: 8 }}>
            Pode ter sido removida do dispositivo.
          </ThemedText>
        </Card>
      </View>
    );
  }

  const l = list;

  function onSaveName() {
    const v = name.trim();
    if (!v) {
      setNameError('Informe um nome.');
      return;
    }
    actions.renameList(l.id, v);
    setNameError(undefined);
  }

  function onDeleteList() {
    Alert.alert('Excluir lista', `Deseja excluir "${l.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          actions.deleteList(l.id);
          navigation.goBack();
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={gamesInList}
        keyExtractor={(g) => g.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <Card style={styles.card}>
              <ThemedText variant="subtitle">Detalhes da lista</ThemedText>
              <View style={{ height: 12 }} />
              <TextField
                label="Nome"
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  setNameError(undefined);
                }}
                error={nameError}
              />
              <View style={{ height: 12 }} />
              <View style={styles.row}>
                <ThemedButton label="SALVAR" variant="secondary" onPress={onSaveName} />
                <ThemedButton label="EXCLUIR LISTA" variant="danger" onPress={onDeleteList} />
              </View>
            </Card>
            <Card style={styles.card}>
              <ThemedText variant="subtitle">Jogos ({gamesInList.length})</ThemedText>
              <ThemedText variant="muted" style={{ marginTop: 8 }}>
                Para adicionar/remover jogos, use a seção “Listas” no detalhe do jogo.
              </ThemedText>
            </Card>
          </>
        }
        ListEmptyComponent={
          <Card style={styles.card}>
            <ThemedText variant="subtitle">Lista vazia</ThemedText>
            <ThemedText variant="muted" style={{ marginTop: 8 }}>
              Abra um jogo e adicione ele a esta lista.
            </ThemedText>
          </Card>
        }
        renderItem={({ item }) => {
          const minutes = getTotalMinutes(item);
          return (
            <Card style={styles.card}>
              <Pressable onPress={() => navigation.navigate('GameDetail', { gameId: item.id })}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="subtitle" numberOfLines={1}>
                      {item.title}
                    </ThemedText>
                    <ThemedText variant="muted" style={{ marginTop: 6 }}>
                      {formatDuration(minutes)}
                    </ThemedText>
                  </View>
                  <ThemedButton
                    label="REMOVER"
                    variant="danger"
                    style={styles.smallDanger}
                    onPress={() => actions.removeGameFromList(l.id, item.id)}
                  />
                </View>
              </Pressable>
            </Card>
          );
        }}
      />
    </View>
  );
}

function isGameEntry(value: GameEntry | undefined): value is GameEntry {
  return Boolean(value && typeof value.id === 'string');
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
