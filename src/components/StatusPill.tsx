import { StyleSheet, View } from 'react-native';
import { Colors } from '../theme/colors';
import { ThemedText } from './ThemedText';
import type { GameStatus } from '../types/game';

export function StatusPill({ status }: { status: GameStatus }) {
  const { label, bg, border } = statusMeta(status);
  return (
    <View style={[styles.base, { backgroundColor: bg, borderColor: border }]}>
      <ThemedText variant="label" style={styles.text}>
        {label}
      </ThemedText>
    </View>
  );
}

function statusMeta(status: GameStatus) {
  switch (status) {
    case 'wishlist':
      return { label: 'WISHLIST', bg: '#7A5B00', border: '#FFB703' };
    case 'backlog':
      return { label: 'BACKLOG', bg: '#1A2742', border: '#3D5A93' };
    case 'playing':
      return { label: 'JOGANDO', bg: '#123E4F', border: '#4CC9F0' };
    case 'finished':
      return { label: 'FINALIZADO', bg: '#124D38', border: '#2EE59D' };
    case 'completed_100':
      return { label: 'PLATINADO', bg: '#39256E', border: '#A08BFF' };
    case 'abandoned':
      return { label: 'ABANDONADO', bg: '#5E1F2F', border: '#FF4D6D' };
  }
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  text: {
    color: '#EAF2FF',
    fontSize: 12,
  },
});
