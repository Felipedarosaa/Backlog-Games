import React from 'react';
import { Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../components/Card';
import { Segmented } from '../components/Segmented';
import { TextField } from '../components/TextField';
import { ThemedButton } from '../components/ThemedButton';
import { ThemedText } from '../components/ThemedText';
import { useGameStore } from '../store/GameStore';
import { Colors } from '../theme/colors';
import { Metrics } from '../theme/metrics';

type Mode = 'signIn' | 'signUp';

const GOOGLE_ICON_URI = 'https://fonts.gstatic.com/s/i/productlogos/googleg/v6/web-48dp/logo_googleg_color_1x_web_48dp.png';

export function AuthScreen() {
  const { actions } = useGameStore();
  const [mode, setMode] = React.useState<Mode>('signIn');
  const [username, setUsername] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [notice, setNotice] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    setError(undefined);
    setNotice(undefined);
  }, [mode]);

  const primaryLabel = mode === 'signIn' ? 'Entrar' : 'Criar conta';

  const submit = async () => {
    if (submitting) return;
    setError(undefined);
    setNotice(undefined);
    setSubmitting(true);
    try {
      if (mode === 'signIn') {
        const res = await actions.signIn(email, password);
        if (!res.ok) setError(res.error);
        return;
      }
      const res = await actions.signUp(username, email, password, confirmPassword);
      if (!res.ok) setError(res.error);
      if (res.ok && res.message) setNotice(res.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <View style={styles.center}>
          <View style={styles.brand}>
            <LinearGradient
              colors={['#4CC9F025', '#7C5CFF14', '#00000000']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoBadge}
            >
              <Ionicons name="game-controller" size={26} color={Colors.accent2} />
            </LinearGradient>
            <ThemedText variant="title" style={styles.title}>
              Backlog Gamer
            </ThemedText>
          </View>
          <ThemedText variant="muted" style={styles.subtitle}>
            Faça login para manter seu progresso salvo.
          </ThemedText>

          <Card style={styles.card}>
            <LinearGradient
              pointerEvents="none"
              colors={['#4CC9F0', '#7C5CFF', '#FF4D6D', '#FFB703']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cardTopLine}
            />
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { key: 'signIn', label: 'Login' },
                { key: 'signUp', label: 'Criar conta' },
              ]}
            />

            <View style={styles.form}>
              {mode === 'signUp' ? (
                <TextField
                  label="Nome de usuário"
                  left={<Ionicons name="person-outline" size={18} color={Colors.textMuted} />}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="ex: felipe_rosa"
                  returnKeyType="next"
                />
              ) : null}
              <TextField
                label="E-mail"
                left={<Ionicons name="mail-outline" size={18} color={Colors.textMuted} />}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="seuemail@exemplo.com"
                returnKeyType="next"
              />
              <TextField
                label="Senha"
                left={<Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} />}
                right={
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={10}
                    style={({ pressed }) => [styles.eye, pressed ? styles.eyePressed : undefined]}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={Colors.textMuted}
                    />
                  </Pressable>
                }
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="••••••"
                returnKeyType={mode === 'signIn' ? 'go' : 'next'}
                onSubmitEditing={mode === 'signIn' ? () => void submit() : undefined}
              />
              {mode === 'signUp' ? (
                <TextField
                  label="Confirmar senha"
                  left={<Ionicons name="shield-checkmark-outline" size={18} color={Colors.textMuted} />}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="••••••"
                  returnKeyType="go"
                  onSubmitEditing={() => void submit()}
                />
              ) : null}

              {error ? (
                <ThemedText variant="label" style={styles.error}>
                  {error}
                </ThemedText>
              ) : null}
              {notice ? (
                <ThemedText variant="muted" style={styles.notice}>
                  {notice}
                </ThemedText>
              ) : null}

              <ThemedButton
                label={primaryLabel}
                onPress={submit}
                disabled={submitting}
                left={
                  <Ionicons
                    name={mode === 'signIn' ? 'log-in-outline' : 'person-add-outline'}
                    size={18}
                    color={Colors.text}
                  />
                }
              />

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <ThemedText variant="muted" style={styles.dividerText}>
                  ou
                </ThemedText>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.providerRow}>
                <Pressable
                  disabled={submitting}
                  onPress={async () => {
                    if (submitting) return;
                    setError(undefined);
                    setNotice(undefined);
                    setSubmitting(true);
                    try {
                      const res =
                        mode === 'signIn'
                          ? await actions.signInWithProvider('google')
                          : await actions.signUpWithProvider('google', username);
                      if (!res.ok) setError(res.error);
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.providerCircle,
                    styles.providerCircleGoogle,
                    pressed ? styles.providerCirclePressed : undefined,
                  ]}
                >
                  <Image source={{ uri: GOOGLE_ICON_URI }} style={styles.googleIcon} />
                </Pressable>
                <Pressable
                  disabled={submitting}
                  onPress={async () => {
                    if (submitting) return;
                    setError(undefined);
                    setNotice(undefined);
                    setSubmitting(true);
                    try {
                      const res =
                        mode === 'signIn'
                          ? await actions.signInWithProvider('psn')
                          : await actions.signUpWithProvider('psn', username);
                      if (!res.ok) setError(res.error);
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  hitSlop={10}
                  style={({ pressed }) => [styles.providerCircle, pressed ? styles.providerCirclePressed : undefined]}
                >
                  <LinearGradient
                    pointerEvents="none"
                    colors={['#0070D1', '#003087', '#0F173000']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <Ionicons name="logo-playstation" size={24} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  disabled={submitting}
                  onPress={async () => {
                    if (submitting) return;
                    setError(undefined);
                    setNotice(undefined);
                    setSubmitting(true);
                    try {
                      const res =
                        mode === 'signIn'
                          ? await actions.signInWithProvider('steam')
                          : await actions.signUpWithProvider('steam', username);
                      if (!res.ok) setError(res.error);
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  hitSlop={10}
                  style={({ pressed }) => [styles.providerCircle, pressed ? styles.providerCirclePressed : undefined]}
                >
                  <LinearGradient
                    pointerEvents="none"
                    colors={['#171A21', '#1B2838', '#0F173000']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <Ionicons name="logo-steam" size={24} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          </Card>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  center: {
    flex: 1,
    paddingHorizontal: Metrics.pad,
    justifyContent: 'center',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F1730CC',
    borderWidth: 1,
    borderColor: '#2F4E86',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  card: {
    padding: Metrics.pad,
    gap: 14,
  },
  cardTopLine: {
    height: 2,
    borderRadius: 999,
    marginBottom: 12,
    opacity: 0.95,
  },
  form: {
    gap: 12,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2F4E8638',
  },
  dividerText: {
    opacity: 0.9,
  },
  providerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 2,
  },
  providerCircle: {
    width: 62,
    height: 62,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FFFFFF22',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  providerCircleGoogle: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DADCE0',
  },
  googleIcon: {
    width: 26,
    height: 26,
    resizeMode: 'contain',
  },
  providerCirclePressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.92,
  },
  error: {
    color: Colors.danger,
    textAlign: 'center',
    marginTop: 2,
  },
  notice: {
    textAlign: 'center',
    marginTop: 2,
  },
  eye: {
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  eyePressed: {
    backgroundColor: '#FFFFFF0A',
  },
});
