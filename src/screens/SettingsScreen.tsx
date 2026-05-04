import React, { useEffect, useState } from 'react';
import { Alert, ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Card } from '../components/Card';
import { ThemedButton } from '../components/ThemedButton';
import { ThemedText } from '../components/ThemedText';
import { TextField } from '../components/TextField';
import { Colors } from '../theme/colors';
import { Metrics } from '../theme/metrics';
import { useGameStore } from '../store/GameStore';

export function SettingsScreen() {
  const { state, actions } = useGameStore();
  const [hltbBaseUrl, setHltbBaseUrl] = useState(state.settings.hltbBaseUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [testingHltb, setTestingHltb] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | undefined>(undefined);
  const [hltbError, setHltbError] = useState<string | undefined>();
  const [hltbTestResult, setHltbTestResult] = useState<string | undefined>();

  useEffect(() => {
    const sub = NetInfo.addEventListener((s) => {
      const next = Boolean(s.isConnected && (s.isInternetReachable ?? true));
      setIsOnline(next);
    });
    return () => sub();
  }, []);

  async function onSave() {
    setSaving(true);
    try {
      await actions.setHltbBaseUrl(hltbBaseUrl.trim() ? hltbBaseUrl.trim() : undefined);
      Alert.alert('Salvo', 'Configurações salvas no Supabase.');
    } catch {
      Alert.alert('Falha ao salvar', 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function onTestHltb() {
    setHltbError(undefined);
    setHltbTestResult(undefined);
    const base = hltbBaseUrl.trim().replace(/\/$/, '');
    if (!base) {
      setHltbError('Informe a URL base do seu proxy do HowLongToBeat para testar.');
      return;
    }
    setTestingHltb(true);
    try {
      const url = `${base}/api/search?q=${encodeURIComponent('Hollow Knight')}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: any = await res.json();
      const count = Array.isArray(data?.results) ? data.results.length : 0;
      const top = data?.results?.[0]?.title ?? data?.results?.[0]?.name;
      setHltbTestResult(top ? `OK: "${String(top)}" (top 1 de ${count})` : `OK: ${count} resultados`);
    } catch (e: any) {
      setHltbError(typeof e?.message === 'string' ? e.message : 'Falha ao testar HLTB.');
    } finally {
      setTestingHltb(false);
    }
  }

  function onReset() {
    Alert.alert('Apagar dados', 'Apaga os dados da sua conta no Supabase (jogos, listas, sessões e conquistas).', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => void actions.reset() },
    ]);
  }

  function onClearOutbox() {
    Alert.alert('Limpar fila offline', 'Remove a fila de ações pendentes para uma sincronização futura.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Limpar', style: 'destructive', onPress: () => actions.clearSyncOutbox() },
    ]);
  }

  function onSignOut() {
    Alert.alert('Sair da conta', 'Deseja deslogar desta conta neste dispositivo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sincronizar',
        onPress: () => {
          void (async () => {
            try {
              await actions.syncNow();
              Alert.alert('Sincronizado', 'Fila enviada com sucesso.');
            } catch (e: any) {
              Alert.alert('Falha ao sincronizar', typeof e?.message === 'string' ? e.message : 'Tente novamente.');
            }
          })();
        },
      },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await actions.signOut();
            } catch (e: any) {
              Alert.alert(
                'Não foi possível sair',
                typeof e?.message === 'string'
                  ? e.message
                  : 'Existem alterações pendentes. Sincronize ou limpe a fila.',
              );
            }
          })();
        },
      },
      {
        text: 'Forçar saída',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await actions.forceSignOut();
            } catch (e: any) {
              Alert.alert('Falha ao sair', typeof e?.message === 'string' ? e.message : 'Tente novamente.');
            }
          })();
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Card style={styles.card}>
        <ThemedText variant="subtitle">Conta</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 8 }}>
          {state.auth.currentUser?.username ? `Logado como: ${state.auth.currentUser.username}` : 'Logado'}
        </ThemedText>
        {state.auth.currentUser?.email ? (
          <ThemedText variant="muted" style={{ marginTop: 6 }}>
            {state.auth.currentUser.email}
          </ThemedText>
        ) : null}
        <View style={{ height: 14 }} />
        <ThemedButton label="SAIR" variant="danger" onPress={onSignOut} />
      </Card>

      <Card style={styles.card}>
        <ThemedText variant="subtitle">HowLongToBeat (HLTB)</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 8 }}>
          Para buscar estimativas automaticamente, informe a URL base de um proxy compatível com endpoints /api/search e
          /api/game.
        </ThemedText>

        <View style={{ height: 14 }} />

        <TextField
          label="URL base"
          value={hltbBaseUrl}
          onChangeText={(t) => {
            setHltbBaseUrl(t);
            setHltbError(undefined);
          }}
          placeholder="Ex.: https://seu-servidor.com"
          autoCapitalize="none"
          autoCorrect={false}
          error={hltbError}
        />

        {hltbTestResult ? (
          <ThemedText variant="muted" style={{ marginTop: 10 }}>
            {hltbTestResult}
          </ThemedText>
        ) : null}

        <View style={{ height: 14 }} />

        <View style={styles.row}>
          <ThemedButton label={saving ? 'SALVANDO…' : 'SALVAR'} onPress={onSave} disabled={saving} />
          <ThemedButton label="TESTAR HLTB" variant="secondary" onPress={onTestHltb} disabled={testingHltb} />
        </View>

        {testingHltb ? (
          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <ActivityIndicator color={Colors.accent2} />
          </View>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <ThemedText variant="subtitle">Dados no Supabase</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 8 }}>
          Seus dados ficam armazenados na nuvem e vinculados à sua conta.
        </ThemedText>
        <View style={{ height: 14 }} />
        <ThemedButton label="APAGAR DADOS" variant="danger" onPress={onReset} />
      </Card>

      <Card style={styles.card}>
        <ThemedText variant="subtitle">Offline / Sincronização</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 8 }}>
          Quando você fica offline, o app segura as alterações em memória e tenta sincronizar assim que voltar a ficar online.
        </ThemedText>
        <View style={{ height: 12 }} />
        <View style={styles.syncRow}>
          <View style={styles.syncPill}>
            <View style={[styles.dot, { backgroundColor: isOnline === false ? Colors.danger : Colors.accent2 }]} />
            <ThemedText variant="label">{isOnline === false ? 'OFFLINE' : 'ONLINE'}</ThemedText>
          </View>
          <View style={styles.syncPill}>
            <ThemedText variant="label">{state.syncOutbox.length} ações na fila</ThemedText>
          </View>
        </View>
        <View style={{ height: 12 }} />
        <View style={styles.row}>
          <ThemedButton
            label="SINCRONIZAR"
            variant="secondary"
            onPress={() => {
              void (async () => {
                try {
                  await actions.syncNow();
                  Alert.alert('Sincronizado', 'Fila enviada com sucesso.');
                } catch (e: any) {
                  Alert.alert('Falha ao sincronizar', typeof e?.message === 'string' ? e.message : 'Tente novamente.');
                }
              })();
            }}
            disabled={!state.syncOutbox.length || isOnline === false}
          />
          <ThemedButton label="LIMPAR FILA" variant="secondary" onPress={onClearOutbox} disabled={!state.syncOutbox.length} />
        </View>
      </Card>
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
  },
  card: {
    padding: Metrics.pad,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  syncRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#14223CDD',
    borderWidth: 1,
    borderColor: '#3F5F99',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 6,
  },
});
