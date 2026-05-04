import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AddStackParamList } from '../navigation/types';
import { Colors } from '../theme/colors';
import { Metrics } from '../theme/metrics';
import { Card } from '../components/Card';
import { ThemedButton } from '../components/ThemedButton';
import { ThemedText } from '../components/ThemedText';
import { TextField } from '../components/TextField';
import { Segmented } from '../components/Segmented';
import { rawgGetGameDetails, rawgSearchGames, RawgError, type RawgGameDetails, type RawgGameSearchItem } from '../api/rawg';
import { gameFromRawg } from '../api/mapping';
import { useGameStore } from '../store/GameStore';
import { validateNonEmpty } from '../utils/validation';

type Props = NativeStackScreenProps<AddStackParamList, 'AddGame'>;

export function AddGameScreen({ navigation }: Props) {
  const { state, actions } = useGameStore();
  const apiKey = state.settings.rawgApiKey;

  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RawgGameSearchItem[]>([]);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [selected, setSelected] = useState<RawgGameDetails | null>(null);
  const [platform, setPlatform] = useState<string>('');
  const [platformCustom, setPlatformCustom] = useState<string>('');
  const [platformError, setPlatformError] = useState<string | undefined>(undefined);

  const canSearch = useMemo(() => query.trim().length >= 2, [query]);

  async function onSearch() {
    setError(undefined);
    setPlatformError(undefined);
    setSelected(null);
    const v = validateNonEmpty(query);
    if (!v.ok) {
      setError(v.message);
      return;
    }
    if (!apiKey) {
      setError('Configure sua RAWG API Key nas Configurações para buscar jogos.');
      return;
    }
    setLoading(true);
    try {
      const list = await rawgSearchGames(v.value, apiKey);
      setResults(list);
      if (list.length === 0) setError('Nenhum jogo encontrado. Tente outro termo.');
    } catch (e) {
      setResults([]);
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }

  async function onSelect(rawgId: number) {
    if (!apiKey) {
      setError('Configure sua RAWG API Key nas Configurações para adicionar jogos.');
      return;
    }
    setError(undefined);
    setAddingId(rawgId);
    try {
      const details = await rawgGetGameDetails(rawgId, apiKey);
      setSelected(details);
      setPlatform('');
      setPlatformCustom('');
      setPlatformError(undefined);
      const firstPlatform = (details.platforms ?? []).map((p) => p.platform?.name).filter(Boolean)[0];
      if (firstPlatform) setPlatform(firstPlatform);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setAddingId(null);
    }
  }

  function onAddSelected() {
    setPlatformError(undefined);
    if (!selected) return;
    const chosen = platform === '__custom__' ? platformCustom.trim() : platform.trim();
    if (!chosen) {
      setPlatformError('Informe a plataforma que você está jogando.');
      return;
    }
    actions.addGame(gameFromRawg(selected, chosen));
    setSelected(null);
    setPlatform('');
    setPlatformCustom('');
    setQuery('');
    setResults([]);
  }

  const platformOptions = useMemo(() => {
    if (!selected) return [];
    const names = (selected.platforms ?? [])
      .map((p) => p.platform?.name)
      .filter((p): p is string => Boolean(p));
    const unique = Array.from(new Set(names));
    unique.sort((a, b) => a.localeCompare(b));
    const opts = unique.map((p) => ({ key: p, label: p }));
    opts.push({ key: '__custom__', label: 'Outro' });
    return opts;
  }, [selected]);

  return (
    <View style={styles.screen}>
      <Card style={styles.topCard}>
        <ThemedText variant="subtitle">Buscar na API</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 8 }}>
          Digite o título e o app consulta a RAWG para trazer capa e metadados.
        </ThemedText>

        <View style={{ height: 14 }} />

        <TextField
          label="Título"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={onSearch}
          error={error}
          placeholder="Ex.: Hollow Knight"
        />

        <View style={{ height: 12 }} />

        <View style={styles.actionsRow}>
          <ThemedButton label="BUSCAR" onPress={onSearch} disabled={!canSearch || loading} />
          <ThemedButton
            label="CONFIG"
            variant="secondary"
            onPress={() => (navigation.getParent() as any)?.navigate('MoreTab', { screen: 'Settings' })}
          />
        </View>
      </Card>

      {selected ? (
        <Card style={styles.resultCard}>
          <ThemedText variant="subtitle">Antes de adicionar</ThemedText>
          <ThemedText variant="muted" style={{ marginTop: 8 }}>
            Selecione a plataforma em que você está jogando.
          </ThemedText>
          <View style={{ height: 14 }} />

          <ThemedText variant="label" style={{ color: Colors.textMuted }}>
            Plataforma
          </ThemedText>
          <Segmented
            value={(platform || '__custom__') as any}
            options={platformOptions as any}
            onChange={(v) => {
              setPlatform(v);
              setPlatformError(undefined);
            }}
            scrollable
            size="compact"
          />

          {platform === '__custom__' || platformOptions.length <= 1 ? (
            <>
              <View style={{ height: 12 }} />
              <TextField
                label="Plataforma (texto)"
                value={platformCustom}
                onChangeText={(t) => {
                  setPlatformCustom(t);
                  setPlatformError(undefined);
                }}
                placeholder="Ex.: Nintendo Switch"
                error={platformError}
              />
            </>
          ) : platformError ? (
            <>
              <View style={{ height: 8 }} />
              <ThemedText variant="label" style={{ color: Colors.danger }}>
                {platformError}
              </ThemedText>
            </>
          ) : null}

          <View style={{ height: 14 }} />
          <View style={styles.actionsRow}>
            <ThemedButton label="CANCELAR" variant="secondary" onPress={() => setSelected(null)} />
            <ThemedButton label="ADICIONAR" onPress={onAddSelected} />
          </View>
        </Card>
      ) : null}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.accent2} />
          <ThemedText variant="muted" style={{ marginTop: 10 }}>
            Consultando API…
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card style={styles.resultCard}>
              <View style={styles.row}>
                <View style={styles.coverWrap}>
                  {item.background_image ? (
                    <Image source={{ uri: item.background_image }} style={styles.cover} />
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
                    {item.name}
                  </ThemedText>
                  <View style={{ height: 8 }} />
                  <ThemedText variant="muted" numberOfLines={2}>
                    {(item.genres ?? []).map((g) => g.name).filter(Boolean).join(' • ') || 'Sem gênero'}
                  </ThemedText>
                  {item.released ? <ThemedText variant="muted">Lançamento: {item.released}</ThemedText> : null}
                </View>
              </View>

              <View style={{ height: 12 }} />

              <ThemedButton
                label={addingId === item.id ? 'CARREGANDO…' : 'SELECIONAR'}
                onPress={() => onSelect(item.id)}
                disabled={addingId != null}
              />
            </Card>
          )}
          ListEmptyComponent={
            <View style={{ opacity: 0.9 }}>
              {!error ? (
                <Pressable onPress={onSearch} disabled={!canSearch || loading}>
                  <Card>
                    <ThemedText variant="subtitle">Dica</ThemedText>
                    <ThemedText variant="muted" style={{ marginTop: 8 }}>
                      Digite um título e toque em “BUSCAR”.
                    </ThemedText>
                  </Card>
                </Pressable>
              ) : null}
            </View>
          }
        />
      )}
    </View>
  );
}

function formatApiError(e: unknown) {
  if (e instanceof RawgError) return e.message;
  if (e && typeof e === 'object' && 'message' in e && typeof (e as any).message === 'string') return (e as any).message;
  return 'Erro inesperado ao consultar a API.';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: Metrics.pad,
    backgroundColor: Colors.bg,
    gap: Metrics.gap,
  },
  topCard: {
    padding: Metrics.pad,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  list: {
    gap: Metrics.gap,
    paddingBottom: 24,
  },
  resultCard: {
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
