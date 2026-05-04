import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LibraryStackParamList } from '../navigation/types';
import { Card } from '../components/Card';
import { Segmented } from '../components/Segmented';
import { StatusPill } from '../components/StatusPill';
import { ThemedButton } from '../components/ThemedButton';
import { ThemedText } from '../components/ThemedText';
import { TextField } from '../components/TextField';
import { Colors } from '../theme/colors';
import { Metrics } from '../theme/metrics';
import { useGameStore } from '../store/GameStore';
import { getProgressRatio, getTotalMinutes } from '../store/selectors';
import { formatDuration, nowISO } from '../utils/time';
import { clampRating, validateTargetHours } from '../utils/validation';
import type { GameStatus } from '../types/game';

type Props =
  NativeStackScreenProps<LibraryStackParamList, 'GameDetail'>;

export function GameDetailScreen({ route, navigation }: Props) {
  const gameId = route.params.gameId;
  const { state, actions } = useGameStore();
  const game = useMemo(() => state.games.find((g) => g.id === gameId), [state.games, gameId]);

  const [ratingText, setRatingText] = useState(game?.rating != null ? String(game.rating) : '');
  const [ratingNoteText, setRatingNoteText] = useState(game?.ratingNote ?? '');
  const [targetText, setTargetText] = useState(game?.targetHours != null ? String(game.targetHours) : '');
  const [priceText, setPriceText] = useState(game?.pricePaid != null ? String(game.pricePaid) : '');
  const [purchasedAtText, setPurchasedAtText] = useState(game?.purchasedAtISO ?? '');
  const [ratingError, setRatingError] = useState<string | undefined>();
  const [targetError, setTargetError] = useState<string | undefined>();
  const [financeError, setFinanceError] = useState<string | undefined>();
  const [hltbLoading, setHltbLoading] = useState(false);
  const [hltbError, setHltbError] = useState<string | undefined>();

  if (!game) {
    return (
      <View style={styles.screen}>
        <Card>
          <ThemedText variant="subtitle">Jogo não encontrado</ThemedText>
          <ThemedText variant="muted" style={{ marginTop: 8 }}>
            Pode ter sido removido do dispositivo.
          </ThemedText>
        </Card>
      </View>
    );
  }

  const g = game;
  const minutes = getTotalMinutes(g);
  const ratio = getProgressRatio(g);
  const hltbBaseUrl = state.settings.hltbBaseUrl?.trim();

  function formatHltbHours(value: number | undefined) {
    if (value == null || !Number.isFinite(value) || value <= 0) return '—';
    const rounded = Math.round(value * 10) / 10;
    return `${rounded} h`;
  }

  async function fetchHltb() {
    setHltbError(undefined);
    const base = (hltbBaseUrl ?? '').replace(/\/$/, '');
    if (!base) {
      Alert.alert('HowLongToBeat', 'Configure a URL base do HLTB em Configurações para buscar automaticamente.');
      return;
    }
    setHltbLoading(true);
    try {
      const url = `${base}/api/search?q=${encodeURIComponent(g.title)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: any = await res.json();
      const first = Array.isArray(data?.results) ? data.results[0] : undefined;
      if (!first) throw new Error('Sem resultados no HowLongToBeat.');

      const times = first?.times ?? {};
      const main = Number.isFinite(times?.main) ? Number(times.main) : Number.isFinite(first?.gameplayMain) ? Number(first.gameplayMain) : undefined;
      const mainExtra = Number.isFinite(times?.mainExtra)
        ? Number(times.mainExtra)
        : Number.isFinite(first?.gameplayMainExtra)
          ? Number(first.gameplayMainExtra)
          : undefined;
      const completionist = Number.isFinite(times?.completionist)
        ? Number(times.completionist)
        : Number.isFinite(first?.gameplayCompletionist)
          ? Number(first.gameplayCompletionist)
          : undefined;

      if (main == null && mainExtra == null && completionist == null) {
        throw new Error('Resultado encontrado, mas sem tempos disponíveis.');
      }

      actions.setHltbTimes(g.id, {
        main,
        mainExtra,
        completionist,
        fetchedAtISO: nowISO(),
        matchTitle: typeof first?.title === 'string' ? first.title : typeof first?.name === 'string' ? first.name : undefined,
      });
    } catch (e: any) {
      setHltbError(typeof e?.message === 'string' ? e.message : 'Falha ao buscar HLTB.');
    } finally {
      setHltbLoading(false);
    }
  }

  function saveRating() {
    setRatingError(undefined);
    if (!ratingText.trim()) {
      actions.setRating(g.id, undefined);
      return;
    }
    const parsed = Number(ratingText);
    const clamped = clampRating(parsed);
    if (clamped == null) {
      setRatingError('Informe um número de 0 a 10.');
      return;
    }
    actions.setRating(g.id, clamped);
  }

  function saveRatingNote() {
    const note = ratingNoteText.trim();
    actions.setRatingNote(g.id, note ? note : undefined);
  }

  function saveTarget() {
    setTargetError(undefined);
    const v = validateTargetHours(targetText);
    if (!v.ok) {
      setTargetError(v.message);
      return;
    }
    actions.setTargetHours(g.id, v.value);
  }

  function saveFinance() {
    setFinanceError(undefined);
    const rawPrice = priceText.trim();
    let pricePaid: number | undefined = undefined;
    if (rawPrice) {
      const parsed = Number(rawPrice.replace(',', '.'));
      if (!Number.isFinite(parsed) || parsed < 0) {
        setFinanceError('Preço inválido.');
        return;
      }
      pricePaid = Math.round(parsed * 100) / 100;
    }

    const rawDate = purchasedAtText.trim();
    let purchasedAtISO: string | undefined = undefined;
    if (rawDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        setFinanceError('Data inválida. Use YYYY-MM-DD (ex.: 2026-04-30).');
        return;
      }
      purchasedAtISO = rawDate;
    }

    actions.setPricePaid(g.id, pricePaid);
    actions.setPurchasedAtISO(g.id, purchasedAtISO);
  }

  function onDelete() {
    Alert.alert('Remover jogo', `Deseja remover "${g.title}" do backlog?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          actions.deleteGame(g.id);
          navigation.goBack();
        },
      },
    ]);
  }

  const status = g.status;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={styles.hero}>
        <View style={styles.heroRow}>
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

          <View style={styles.heroMeta}>
            <ThemedText variant="title" numberOfLines={3}>
              {g.title}
            </ThemedText>
            <View style={{ height: 10 }} />
            <StatusPill status={status} />
            <View style={{ height: 10 }} />
            <View style={styles.heroChips}>
              <InfoChip label={formatDuration(minutes)} />
              {g.currentPlatform ? <InfoChip label={g.currentPlatform} /> : null}
              {g.targetHours != null ? <InfoChip label={`Meta: ${g.targetHours} h`} /> : null}
              {g.hltb?.main != null ? <InfoChip label={`HLTB: ${formatHltbHours(g.hltb.main)} (main)`} /> : null}
              {g.status === 'completed_100' ? <InfoChip label="🏆 Platina" /> : null}
            </View>
            {g.released ? <ThemedText variant="muted">Lançamento: {g.released}</ThemedText> : null}
            {g.metacritic != null ? <ThemedText variant="muted">Metacritic: {g.metacritic}</ThemedText> : null}
          </View>
        </View>

        <View style={{ height: 14 }} />

        <Segmented
          value={status}
          options={[
            { key: 'wishlist', label: 'Wishlist' },
            { key: 'backlog', label: 'Backlog' },
            { key: 'playing', label: 'Jogando' },
            { key: 'finished', label: 'Finalizado' },
            { key: 'completed_100', label: '100%' },
            { key: 'abandoned', label: 'Abandonado' },
          ]}
          onChange={(v) => actions.setStatus(g.id, v as GameStatus)}
          scrollable
        />

        <View style={{ height: 12 }} />
        {g.status === 'completed_100' ? (
          <ThemedButton
            label="REMOVER PLATINA"
            variant="secondary"
            onPress={() =>
              Alert.alert('Platina', 'Remover a platina deste jogo?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Remover', style: 'destructive', onPress: () => actions.setStatus(g.id, 'finished') },
              ])
            }
          />
        ) : (
          <ThemedButton
            label="MARCAR PLATINA"
            variant="secondary"
            onPress={() =>
              Alert.alert('Platina', 'Marcar como platinado (100% das conquistas)?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Marcar', onPress: () => actions.setStatus(g.id, 'completed_100') },
              ])
            }
          />
        )}

        <View style={{ height: 12 }} />
        <ThemedButton label="REGISTRAR / AJUSTAR SESSÃO" onPress={() => navigation.navigate('LogSession', { gameId: g.id })} />
      </Card>

      {g.description ? (
        <Card>
          <ThemedText variant="subtitle">Descrição</ThemedText>
          <ThemedText variant="muted" style={{ marginTop: 8 }}>
            {g.description}
          </ThemedText>
        </Card>
      ) : null}

      <Card>
        <ThemedText variant="subtitle">Gêneros</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 8 }}>
          {g.genres.length ? g.genres.join(' • ') : 'Sem gênero'}
        </ThemedText>
        <View style={{ height: 14 }} />
        <ThemedText variant="subtitle">Plataformas</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 8 }}>
          {g.platforms.length ? g.platforms.join(' • ') : 'Sem plataforma'}
        </ThemedText>
      </Card>

      <Card>
        <ThemedText variant="subtitle">Listas personalizadas</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 8 }}>
          Use listas para organizar coleções (ex.: “Co-op”, “Indies”, “Halloween”).
        </ThemedText>
        <View style={{ height: 12 }} />
        {state.lists.length ? (
          <View style={{ gap: 10 }}>
            {state.lists.map((l) => {
              const inList = l.gameIds.includes(g.id);
              return (
                <View key={l.id} style={styles.listRow}>
                  <ThemedText variant="label" style={{ flex: 1 }} numberOfLines={1}>
                    {l.name}
                  </ThemedText>
                  <ThemedButton
                    label={inList ? 'REMOVER' : 'ADICIONAR'}
                    variant={inList ? 'danger' : 'secondary'}
                    style={styles.listActionButton}
                    onPress={() =>
                      inList ? actions.removeGameFromList(l.id, g.id) : actions.addGameToList(l.id, g.id)
                    }
                  />
                </View>
              );
            })}
          </View>
        ) : (
          <>
            <ThemedText variant="muted">Nenhuma lista criada ainda.</ThemedText>
            <View style={{ height: 12 }} />
            <ThemedButton
              label="CRIAR LISTAS"
              variant="secondary"
              onPress={() => (navigation.getParent() as any)?.navigate('MoreTab', { screen: 'Lists' })}
            />
          </>
        )}
      </Card>

      <Card>
        <ThemedText variant="subtitle">Avaliação pessoal</ThemedText>
        <View style={{ height: 10 }} />
        <TextField
          value={ratingText}
          onChangeText={(t) => {
            setRatingText(t);
            setRatingError(undefined);
          }}
          keyboardType="numeric"
          placeholder="Ex.: 9"
          error={ratingError}
          onBlur={saveRating}
        />
        <View style={{ height: 12 }} />
        <ThemedButton label="SALVAR NOTA" variant="secondary" onPress={saveRating} />
        <View style={{ height: 12 }} />
        <TextField
          label="Comentário"
          value={ratingNoteText}
          onChangeText={setRatingNoteText}
          placeholder="Escreva um pouco sobre o jogo…"
          multiline
          onBlur={saveRatingNote}
        />
        <View style={{ height: 12 }} />
        <ThemedButton label="SALVAR COMENTÁRIO" variant="secondary" onPress={saveRatingNote} />
      </Card>

      <Card>
        <ThemedText variant="subtitle">Controle financeiro</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 8 }}>
          Opcional: registre quanto você pagou e quando comprou.
        </ThemedText>
        <View style={{ height: 12 }} />
        <TextField
          label="Preço pago (R$)"
          value={priceText}
          onChangeText={(t) => {
            setPriceText(t);
            setFinanceError(undefined);
          }}
          keyboardType="numeric"
          placeholder="Ex.: 79.90"
          error={financeError}
        />
        <View style={{ height: 12 }} />
        <TextField
          label="Data de compra (YYYY-MM-DD)"
          value={purchasedAtText}
          onChangeText={(t) => {
            setPurchasedAtText(t);
            setFinanceError(undefined);
          }}
          placeholder="Ex.: 2026-04-30"
          autoCapitalize="none"
          autoCorrect={false}
          error={financeError}
        />
        <View style={{ height: 12 }} />
        <ThemedButton label="SALVAR FINANCEIRO" variant="secondary" onPress={saveFinance} />
      </Card>

      <Card>
        <ThemedText variant="subtitle">Meta de conclusão (horas)</ThemedText>
        <View style={{ height: 10 }} />
        <TextField
          value={targetText}
          onChangeText={(t) => {
            setTargetText(t);
            setTargetError(undefined);
          }}
          keyboardType="numeric"
          placeholder="Ex.: 40"
          error={targetError}
          onBlur={saveTarget}
        />
        <View style={{ height: 12 }} />
        <ThemedButton label="SALVAR META" variant="secondary" onPress={saveTarget} />

        {ratio != null ? (
          <>
            <View style={{ height: 14 }} />
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(ratio * 100)}%` }]} />
            </View>
            <ThemedText variant="muted" style={{ marginTop: 8 }}>
              Progresso: {Math.round(ratio * 100)}%
            </ThemedText>
          </>
        ) : null}
      </Card>

      <Card>
        <ThemedText variant="subtitle">Estimativa de tempo (HowLongToBeat)</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 8 }}>
          Tempo médio (em horas) para concluir a campanha principal e/ou 100%.
        </ThemedText>

        <View style={{ height: 12 }} />

        <View style={{ gap: 6 }}>
          <View style={styles.hltbRow}>
            <ThemedText variant="label" style={{ flex: 1 }}>
              História principal
            </ThemedText>
            <ThemedText variant="label">{formatHltbHours(g.hltb?.main)}</ThemedText>
          </View>
          <View style={styles.hltbRow}>
            <ThemedText variant="label" style={{ flex: 1 }}>
              Principal + extras
            </ThemedText>
            <ThemedText variant="label">{formatHltbHours(g.hltb?.mainExtra)}</ThemedText>
          </View>
          <View style={styles.hltbRow}>
            <ThemedText variant="label" style={{ flex: 1 }}>
              100% (completionist)
            </ThemedText>
            <ThemedText variant="label">{formatHltbHours(g.hltb?.completionist)}</ThemedText>
          </View>
        </View>

        {g.hltb?.matchTitle ? (
          <ThemedText variant="muted" style={{ marginTop: 10 }}>
            Match: {g.hltb.matchTitle}
          </ThemedText>
        ) : null}
        {hltbError ? (
          <ThemedText variant="muted" style={{ marginTop: 10, color: Colors.danger }}>
            {hltbError}
          </ThemedText>
        ) : null}

        <View style={{ height: 12 }} />

        <ThemedButton
          label={hltbLoading ? 'BUSCANDO…' : 'BUSCAR NA HLTB'}
          variant="secondary"
          onPress={fetchHltb}
          disabled={hltbLoading}
        />
      </Card>

      <Card>
        <ThemedText variant="subtitle">Sessões</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 8 }}>
          Sessões mais recentes registradas neste jogo.
        </ThemedText>
        <View style={{ height: 14 }} />

        {g.sessions.length === 0 ? (
          <ThemedText variant="muted">Nenhuma sessão ainda.</ThemedText>
        ) : (
          <View style={{ gap: 10 }}>
            {g.sessions.slice(0, 12).map((s) => (
              <View key={s.id}>
                <View style={styles.sessionRow}>
                  <ThemedText variant="label" style={{ flex: 1 }}>
                    {new Date(s.createdAtISO).toLocaleDateString()}
                  </ThemedText>
                  <ThemedText variant="label" style={styles.sessionDuration}>
                    {formatDuration(s.minutes)}
                  </ThemedText>
                  <ThemedButton
                    label="EXCLUIR"
                    variant="danger"
                    style={styles.sessionDeleteButton}
                    onPress={() =>
                      Alert.alert('Remover sessão', 'Deseja remover esta sessão?', [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Remover',
                          style: 'destructive',
                          onPress: () => actions.deleteSession(g.id, s.id),
                        },
                      ])
                    }
                  />
                </View>
                {s.note ? <ThemedText variant="muted">{s.note}</ThemedText> : null}
              </View>
            ))}
            {g.sessions.length > 12 ? (
              <ThemedText variant="muted">Mostrando 12 sessões mais recentes.</ThemedText>
            ) : null}
          </View>
        )}
      </Card>

      <ThemedButton label="REMOVER DO BACKLOG" variant="danger" onPress={onDelete} />
    </ScrollView>
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
    paddingBottom: 32,
  },
  hero: {
    padding: Metrics.pad,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 12,
  },
  coverWrap: {
    width: 110,
    height: 110,
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
  heroMeta: {
    flex: 1,
  },
  heroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
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
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sessionDuration: {
    minWidth: 80,
    textAlign: 'right',
  },
  sessionDeleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  hltbRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listActionButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
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
