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
import { rawgSearchGames } from '../api/rawg';

export function SettingsScreen() {
  const { state, actions } = useGameStore();
  const [apiKey, setApiKey] = useState(state.settings.rawgApiKey ?? '');
  const [hltbBaseUrl, setHltbBaseUrl] = useState(state.settings.hltbBaseUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingHltb, setTestingHltb] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | undefined>(undefined);
  const [error, setError] = useState<string | undefined>();
  const [hltbError, setHltbError] = useState<string | undefined>();
  const [testResult, setTestResult] = useState<string | undefined>();
  const [hltbTestResult, setHltbTestResult] = useState<string | undefined>();

  useEffect(() => {
    const sub = NetInfo.addEventListener((s) => {
      const next = Boolean(s.isConnected && (s.isInternetReachable ?? true));
      setIsOnline(next);
    });
    return () => sub();
  }, []);

  async function onSave() {
    setError(undefined);
    setTestResult(undefined);
    setSaving(true);
    try {
      actions.setApiKey(apiKey.trim() ? apiKey.trim() : undefined);
      actions.setHltbBaseUrl(hltbBaseUrl.trim() ? hltbBaseUrl.trim() : undefined);
      setTestResult('Salvo no dispositivo.');
    } catch {
      setError('Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function onTest() {
    setError(undefined);
    setTestResult(undefined);
    const key = apiKey.trim();
    if (!key) {
      setError('Informe sua RAWG API Key para testar.');
      return;
    }
    setTesting(true);
    try {
      const results = await rawgSearchGames('Hollow Knight', key);
      setTestResult(results.length ? `OK: "${results[0].name}" (top 1 de ${results.length})` : 'OK: sem resultados.');
    } catch (e: any) {
      setError(typeof e?.message === 'string' ? e.message : 'Falha ao testar a API.');
    } finally {
      setTesting(false);
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
    Alert.alert('Limpar dados', 'Apaga todos os jogos e configurações deste app no dispositivo.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => actions.reset() },
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
      { text: 'Sair', style: 'destructive', onPress: () => void actions.signOut() },
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
        <ThemedText variant="subtitle">RAWG API Key</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 8 }}>
          Necessária para buscar capa, descrição, gêneros e metadados automaticamente.
        </ThemedText>

        <View style={{ height: 14 }} />

        <TextField
          label="Chave"
          value={apiKey}
          onChangeText={(t) => {
            setApiKey(t);
            setError(undefined);
          }}
          placeholder="Cole sua RAWG API Key aqui"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={false}
          error={error}
        />

        {testResult ? (
          <ThemedText variant="muted" style={{ marginTop: 10 }}>
            {testResult}
          </ThemedText>
        ) : null}

        <View style={{ height: 14 }} />

        <View style={styles.row}>
          <ThemedButton label={saving ? 'SALVANDO…' : 'SALVAR'} onPress={onSave} disabled={saving} />
          <ThemedButton label="TESTAR API" variant="secondary" onPress={onTest} disabled={testing} />
        </View>

        {testing ? (
          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <ActivityIndicator color={Colors.accent2} />
          </View>
        ) : null}
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
          <ThemedButton label="TESTAR HLTB" variant="secondary" onPress={onTestHltb} disabled={testingHltb} />
        </View>

        {testingHltb ? (
          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <ActivityIndicator color={Colors.accent2} />
          </View>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <ThemedText variant="subtitle">Dados locais</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 8 }}>
          Persistência local via AsyncStorage.
        </ThemedText>
        <View style={{ height: 14 }} />
        <ThemedButton label="LIMPAR TUDO" variant="danger" onPress={onReset} />
      </Card>

      <Card style={styles.card}>
        <ThemedText variant="subtitle">Offline / Sincronização</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 8 }}>
          O app registra suas ações localmente e mantém uma fila pronta para sincronizar quando você ativar cloud no futuro.
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
        <ThemedButton label="LIMPAR FILA" variant="secondary" onPress={onClearOutbox} disabled={!state.syncOutbox.length} />
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
