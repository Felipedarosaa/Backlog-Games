import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type {
  RootStackParamList,
  RootTabParamList,
  LibraryStackParamList,
  AddStackParamList,
  DashboardStackParamList,
  MoreStackParamList,
} from './types';
import { Colors } from '../theme/colors';
import { ThemedText } from '../components/ThemedText';
import { LibraryScreen } from '../screens/LibraryScreen';
import { GameDetailScreen } from '../screens/GameDetailScreen';
import { LogSessionScreen } from '../screens/LogSessionScreen';
import { AddGameScreen } from '../screens/AddGameScreen';
import { ReviewsScreen } from '../screens/ReviewsScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ListsScreen } from '../screens/ListsScreen';
import { ListDetailScreen } from '../screens/ListDetailScreen';
import { AchievementsScreen } from '../screens/AchievementsScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { useGameStore } from '../store/GameStore';

const Tab = createBottomTabNavigator<RootTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const LibraryStack = createNativeStackNavigator<LibraryStackParamList>();
const AddStack = createNativeStackNavigator<AddStackParamList>();
const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.bg,
    card: Colors.surface,
    border: Colors.border,
    text: Colors.text,
    primary: Colors.accent,
  },
};

export function RootNavigator() {
  const { state } = useGameStore();
  const isAuthed = Boolean(state.auth?.currentUser?.id);
  return (
    <NavigationContainer theme={navTheme}>
      <View style={{ flex: 1 }}>
        <GamerBackdrop />
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthed ? (
            <RootStack.Screen name="App" component={AppTabs} />
          ) : (
            <RootStack.Screen name="Auth" component={AuthScreen} />
          )}
        </RootStack.Navigator>
      </View>
    </NavigationContainer>
  );
}

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarBackground: () => (
          <LinearGradient
            colors={['#0A1222F5', '#111C33EE', '#0C162AF0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        ),
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopColor: '#3D5A93CC',
          height: 86,
          paddingBottom: 12,
          paddingTop: 9,
        },
        tabBarActiveTintColor: Colors.accent2,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 14, fontWeight: '700' },
        tabBarItemStyle: { borderRadius: 14, marginHorizontal: 2 },
        tabBarActiveBackgroundColor: '#1E2E4DB3',
      }}
    >
      <Tab.Screen
        name="LibraryTab"
        component={LibraryStackNavigator}
        options={{
          title: 'Backlog',
          tabBarIcon: ({ color }) => <Ionicons name="game-controller" size={26} color={color} />,
        }}
      />
      <Tab.Screen
        name="AddTab"
        component={AddStackNavigator}
        options={{
          title: 'Adicionar',
          tabBarIcon: ({ color }) => <Ionicons name="add-circle" size={26} color={color} />,
        }}
      />
      <Tab.Screen
        name="DashboardTab"
        component={DashboardStackNavigator}
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => <Ionicons name="stats-chart" size={26} color={color} />,
        }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreStackNavigator}
        options={{
          title: 'Mais',
          tabBarIcon: ({ color }) => <Ionicons name="menu" size={26} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function HeaderBackground() {
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <LinearGradient
        colors={['#0A1222F5', '#101C33F0', '#0A1222E6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View pointerEvents="none" style={styles.headerTopLineWrap}>
        <LinearGradient
          colors={['#4CC9F0', '#7C5CFF', '#FF4D6D', '#FFB703']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerTopLine}
        />
      </View>
    </View>
  );
}

function GamerBackdrop() {
  const scan = React.useRef(new Animated.Value(0)).current;
  const pulse = React.useRef(new Animated.Value(0)).current;
  const { height: h } = Dimensions.get('window');

  React.useEffect(() => {
    const scanAnim = Animated.loop(
      Animated.timing(scan, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    scanAnim.start();
    pulseAnim.start();
    return () => {
      scanAnim.stop();
      pulseAnim.stop();
    };
  }, [pulse, scan]);

  const scanY = scan.interpolate({
    inputRange: [0, 1],
    outputRange: [-140, h + 140],
  });

  const glowA = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] });
  const glowB = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.9] });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <LinearGradient colors={['#0A0E1C', '#0B1020', '#0D142A']} style={StyleSheet.absoluteFillObject} />
      <Animated.View style={{ position: 'absolute', top: -120, left: -80, opacity: glowA }}>
        <LinearGradient
          colors={['#7C5CFF30', '#4CC9F000', '#7C5CFF18']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.glow}
        />
      </Animated.View>
      <Animated.View style={{ position: 'absolute', bottom: -140, right: -90, opacity: glowB }}>
        <LinearGradient
          colors={['#4CC9F030', '#7C5CFF00', '#4CC9F01C']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.glow}
        />
      </Animated.View>
      <View style={[styles.stripe, { top: 120 }]} />
      <View style={[styles.stripe, { top: 220, opacity: 0.1 }]} />
      <View style={[styles.stripe, { top: 320, opacity: 0.08 }]} />
      <View style={[styles.stripe, { top: 420, opacity: 0.12 }]} />
      <View style={styles.gridV} />
      <View style={[styles.gridV, { left: '35%', opacity: 0.08 }]} />
      <View style={[styles.gridV, { left: '60%', opacity: 0.06 }]} />
      <View style={[styles.gridV, { left: '82%', opacity: 0.08 }]} />
      <Animated.View style={[styles.scanlineWrap, { transform: [{ translateY: scanY }] }]}>
        <LinearGradient
          colors={['#00000000', '#4CC9F01F', '#7C5CFF14', '#00000000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.scanline}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
  },
  stripe: {
    position: 'absolute',
    left: -120,
    right: -120,
    height: 2,
    backgroundColor: '#4CC9F033',
    transform: [{ rotate: '-12deg' }],
  },
  gridV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '12%',
    width: 1,
    backgroundColor: '#7C5CFF12',
    opacity: 0.08,
  },
  scanlineWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  scanline: {
    height: 140,
    opacity: 0.9,
  },
  headerTopLineWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerTopLine: {
    height: 3,
    opacity: 1,
  },
  headerGreeting: {
    color: Colors.text,
  },
});

function HeaderGreetingTitle() {
  const { state } = useGameStore();
  const username = state.auth?.currentUser?.username?.trim();
  return (
    <ThemedText numberOfLines={1} variant="subtitle" style={styles.headerGreeting}>
      {username ? `Olá, ${username}` : 'Olá'}
    </ThemedText>
  );
}

function LibraryStackNavigator() {
  return (
    <LibraryStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: 'transparent' },
        headerBackground: () => <HeaderBackground />,
        headerTintColor: Colors.text,
        contentStyle: { backgroundColor: Colors.bg },
      }}
    >
      <LibraryStack.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          headerTitle: () => <HeaderGreetingTitle />,
        }}
      />
      <LibraryStack.Screen name="Goals" component={GoalsScreen} options={{ title: 'Metas' }} />
      <LibraryStack.Screen name="GameDetail" component={GameDetailScreen} options={{ title: 'Detalhes' }} />
      <LibraryStack.Screen
        name="LogSession"
        component={LogSessionScreen}
        options={{ title: 'Registrar sessão' }}
      />
    </LibraryStack.Navigator>
  );
}

function AddStackNavigator() {
  return (
    <AddStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: 'transparent' },
        headerBackground: () => <HeaderBackground />,
        headerTintColor: Colors.text,
        contentStyle: { backgroundColor: Colors.bg },
      }}
    >
      <AddStack.Screen name="AddGame" component={AddGameScreen} options={{ title: 'Adicionar jogo' }} />
    </AddStack.Navigator>
  );
}

function MoreStackNavigator() {
  return (
    <MoreStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: 'transparent' },
        headerBackground: () => <HeaderBackground />,
        headerTintColor: Colors.text,
        contentStyle: { backgroundColor: Colors.bg },
      }}
    >
      <MoreStack.Screen name="MoreHome" component={MoreScreen} options={{ title: 'Mais' }} />
      <MoreStack.Screen name="Achievements" component={AchievementsScreen as any} options={{ title: 'Conquistas' }} />
      <MoreStack.Screen name="Reviews" component={ReviewsScreen as any} options={{ title: 'Avaliações' }} />
      <MoreStack.Screen name="Lists" component={ListsScreen as any} options={{ title: 'Listas' }} />
      <MoreStack.Screen name="ListDetail" component={ListDetailScreen as any} options={{ title: 'Lista' }} />
      <MoreStack.Screen name="Settings" component={SettingsScreen as any} options={{ title: 'Configurações' }} />
      <MoreStack.Screen name="GameDetail" component={GameDetailScreen as any} options={{ title: 'Detalhes' }} />
      <MoreStack.Screen name="LogSession" component={LogSessionScreen as any} options={{ title: 'Registrar sessão' }} />
    </MoreStack.Navigator>
  );
}

function DashboardStackNavigator() {
  return (
    <DashboardStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: 'transparent' },
        headerBackground: () => <HeaderBackground />,
        headerTintColor: Colors.text,
        contentStyle: { backgroundColor: Colors.bg },
      }}
    >
      <DashboardStack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Estatísticas' }} />
      <DashboardStack.Screen name="GameDetail" component={GameDetailScreen} options={{ title: 'Detalhes' }} />
      <DashboardStack.Screen
        name="LogSession"
        component={LogSessionScreen}
        options={{ title: 'Registrar sessão' }}
      />
    </DashboardStack.Navigator>
  );
}
