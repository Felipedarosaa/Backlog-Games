import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LibraryStackParamList } from '../navigation/types';
import { Card } from '../components/Card';
import { ThemedButton } from '../components/ThemedButton';
import { ThemedText } from '../components/ThemedText';
import { TextField } from '../components/TextField';
import { Segmented } from '../components/Segmented';
import { Colors } from '../theme/colors';
import { Metrics } from '../theme/metrics';
import { useGameStore } from '../store/GameStore';
import { getTotalMinutes } from '../store/selectors';
import { formatDuration } from '../utils/time';

type Props =
  NativeStackScreenProps<LibraryStackParamList, 'LogSession'>;

type OperationMode = 'add' | 'subtract';
type RegisterMode = 'session' | 'set_total';

export function LogSessionScreen({ route, navigation }: Props) {
  const { gameId } = route.params;
  const { state, actions } = useGameStore();
  const game = useMemo(() => state.games.find((g) => g.id === gameId), [state.games, gameId]);

  const [registerMode, setRegisterMode] = useState<RegisterMode>('session');
  const [operationMode, setOperationMode] = useState<OperationMode>('add');
  const [hoursText, setHoursText] = useState('');
  const [minutesText, setMinutesText] = useState('');
  const [totalHoursText, setTotalHoursText] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | undefined>();
  const totalCurrent = game ? getTotalMinutes(game) : 0;
  const parsedHours = parseNonNegativeInt(hoursText);
  const parsedMinutes = parseNonNegativeInt(minutesText);
  const inputMinutes = computeSessionMinutes(parsedHours, parsedMinutes);
  const parsedTotalHours = parseNonNegativeDecimal(totalHoursText);
  const targetTotalMinutes = parsedTotalHours == null ? 0 : Math.round(parsedTotalHours * 60);
  const totalAdjustDelta = targetTotalMinutes - totalCurrent;
  const previewDelta =
    registerMode === 'session'
      ? operationMode === 'add'
        ? inputMinutes
        : -inputMinutes
      : totalAdjustDelta;
  const nextTotalPreview = Math.max(0, totalCurrent + previewDelta);

  function onSave() {
    setError(undefined);

    if (registerMode === 'session') {
      if (parsedHours == null || parsedMinutes == null) {
        setError('Use apenas números inteiros em horas e minutos.');
        return;
      }
      if (parsedHours > 24) {
        setError('Horas muito altas. Use no máximo 24 horas por sessão.');
        return;
      }
      if (parsedMinutes > 59) {
        setError('Minutos devem ficar entre 0 e 59.');
        return;
      }
      if (inputMinutes <= 0) {
        setError('Informe um tempo maior que zero.');
        return;
      }
      if (operationMode === 'subtract' && inputMinutes > totalCurrent) {
        setError(`Não é possível subtrair mais do que o total atual (${formatDuration(totalCurrent)}).`);
        return;
      }

      const signedMinutes = operationMode === 'subtract' ? -inputMinutes : inputMinutes;
      actions.addSession(gameId, signedMinutes, note.trim() ? note.trim() : undefined);
      navigation.goBack();
      return;
    }

    if (parsedTotalHours == null) {
      setError('Informe o total de horas usando números (ex.: 100 ou 100,5).');
      return;
    }
    if (parsedTotalHours > 100000) {
      setError('Valor muito alto. Verifique o total informado.');
      return;
    }
    if (totalAdjustDelta === 0) {
      setError('O total informado é igual ao total atual. Nada para ajustar.');
      return;
    }

    actions.addSession(gameId, totalAdjustDelta, note.trim() ? note.trim() : 'Ajuste de histórico');
    navigation.goBack();
  }

  function setPreset(totalMinutes: number) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    setHoursText(h > 0 ? String(h) : '');
    setMinutesText(m > 0 ? String(m) : '');
    setError(undefined);
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <ThemedText variant="subtitle">Registrar sessão</ThemedText>
          {game ? (
            <ThemedText variant="muted" style={{ marginTop: 8 }}>
              {game.title}
            </ThemedText>
          ) : null}
          <ThemedText variant="muted" style={{ marginTop: 6 }}>
            Total atual: {formatDuration(totalCurrent)}
          </ThemedText>

          <View style={{ height: 14 }} />

          <ThemedText variant="label" style={{ color: Colors.textMuted }}>
            Tipo de registro
          </ThemedText>
          <Segmented
            value={registerMode}
            options={[
              { key: 'session', label: 'Sessão' },
              { key: 'set_total', label: 'Definir total' },
            ]}
            onChange={(v) => {
              setRegisterMode(v);
              setError(undefined);
            }}
          />

          <View style={{ height: 12 }} />

          {registerMode === 'session' ? (
            <>
          <ThemedText variant="label" style={{ color: Colors.textMuted }}>
            Ação
          </ThemedText>
          <Segmented
            value={operationMode}
            options={[
              { key: 'add', label: 'Adicionar' },
              { key: 'subtract', label: 'Subtrair' },
            ]}
            onChange={(v) => {
              setOperationMode(v);
              setError(undefined);
            }}
          />

          <View style={{ height: 12 }} />

          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <TextField
                label="Horas"
                value={hoursText}
                onChangeText={(t) => {
                  setHoursText(sanitizeDigits(t));
                  setError(undefined);
                }}
                keyboardType="number-pad"
                placeholder="Ex.: 1"
                error={error}
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                label="Minutos"
                value={minutesText}
                onChangeText={(t) => {
                  setMinutesText(sanitizeDigits(t));
                  setError(undefined);
                }}
                keyboardType="number-pad"
                placeholder="Ex.: 30"
                error={error}
              />
            </View>
          </View>

          <View style={{ height: 8 }} />
          <View style={styles.presetsRow}>
            <ThemedButton label="15m" variant="secondary" style={styles.presetBtn} onPress={() => setPreset(15)} />
            <ThemedButton label="30m" variant="secondary" style={styles.presetBtn} onPress={() => setPreset(30)} />
            <ThemedButton label="45m" variant="secondary" style={styles.presetBtn} onPress={() => setPreset(45)} />
            <ThemedButton label="1h" variant="secondary" style={styles.presetBtn} onPress={() => setPreset(60)} />
            <ThemedButton label="2h" variant="secondary" style={styles.presetBtn} onPress={() => setPreset(120)} />
          </View>

          <View style={{ height: 10 }} />
          <View style={styles.previewBox}>
            <ThemedText variant="label">
              {operationMode === 'add' ? 'Será adicionado:' : 'Será subtraído:'} {formatDuration(inputMinutes)}
            </ThemedText>
            <ThemedText variant="muted" style={{ marginTop: 4 }}>
              Novo total previsto: {formatDuration(nextTotalPreview)}
            </ThemedText>
          </View>
            </>
          ) : (
            <>
              <TextField
                label="Total de horas jogadas"
                value={totalHoursText}
                onChangeText={(t) => {
                  setTotalHoursText(sanitizeDecimal(t));
                  setError(undefined);
                }}
                keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                placeholder="Ex.: 100 ou 100,5"
                error={error}
              />
              <View style={{ height: 10 }} />
              <View style={styles.previewBox}>
                <ThemedText variant="label">Total alvo: {formatDuration(targetTotalMinutes)}</ThemedText>
                <ThemedText variant="muted" style={{ marginTop: 4 }}>
                  Ajuste aplicado: {previewDelta >= 0 ? '+' : ''}
                  {formatDuration(previewDelta)}
                </ThemedText>
                <ThemedText variant="muted" style={{ marginTop: 4 }}>
                  Novo total previsto: {formatDuration(nextTotalPreview)}
                </ThemedText>
              </View>
            </>
          )}

          <View style={{ height: 12 }} />

          <TextField
            label="Nota (opcional)"
            value={note}
            onChangeText={setNote}
            placeholder="Ex.: matei o boss do ato 2"
            multiline
          />

          <View style={{ height: 14 }} />

          <ThemedButton label="SALVAR" onPress={onSave} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function sanitizeDigits(input: string) {
  return input.replace(/[^\d]/g, '');
}

function sanitizeDecimal(input: string) {
  const normalized = input.replace(',', '.');
  const cleaned = normalized.replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join('')}`;
}

function parseNonNegativeInt(input: string) {
  const v = input.trim();
  if (!v) return 0;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  if (!Number.isInteger(n)) return undefined;
  if (n < 0) return undefined;
  return n;
}

function parseNonNegativeDecimal(input: string) {
  const v = input.trim().replace(',', '.');
  if (!v) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  if (n < 0) return undefined;
  return n;
}

function computeSessionMinutes(hours: number | undefined, minutes: number | undefined) {
  if (hours == null || minutes == null) return 0;
  return hours * 60 + minutes;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    padding: Metrics.pad,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  previewBox: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
  },
});
