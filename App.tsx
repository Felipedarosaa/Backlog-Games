import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { Colors } from './src/theme/colors';
import { GameStoreProvider } from './src/store/GameStore';
import { RootNavigator } from './src/navigation/RootNavigator';

enableScreens(true);

export default function App() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_700Bold });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.accent2} />
          <Text style={{ color: Colors.textMuted, marginTop: 12, fontFamily: 'Inter_500Medium' }}>
            Carregando…
          </Text>
      </View>
    );
  }


  return (
    <ErrorBoundary>
      <GameStoreProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <StatusBar style="light" />
            <RootNavigator />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </GameStoreProvider>
    </ErrorBoundary>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: Colors.bg,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <Text style={{ color: Colors.danger, fontSize: 16, marginBottom: 10 }}>Erro ao renderizar</Text>
          <Text selectable style={{ color: Colors.textMuted, textAlign: 'center' }}>
            {this.state.error.message}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}
