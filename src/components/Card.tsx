import { View, StyleSheet, type ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';
import { Metrics } from '../theme/metrics';

export function Card({ style, children, ...props }: ViewProps) {
  return (
    <View {...props} style={[styles.card, style]}>
      <LinearGradient
        pointerEvents="none"
        colors={['#7C5CFF22', '#4CC9F005']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.overlay}
      />
      <View pointerEvents="none" style={styles.topStripe} />
      <View pointerEvents="none" style={[styles.corner, styles.cornerTL]} />
      <View pointerEvents="none" style={[styles.corner, styles.cornerTR]} />
      <View pointerEvents="none" style={[styles.corner, styles.cornerBL]} />
      <View pointerEvents="none" style={[styles.corner, styles.cornerBR]} />
      <View pointerEvents="none" style={styles.bottomStripe} />
      {children}
    </View>
  );
}
                                  
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderColor: '#2F4E86',
    borderWidth: 1.25,
    borderRadius: 18,
    overflow: 'hidden',
    padding: Metrics.padSm,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#4CC9F080',
  },
  bottomStripe: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#7C5CFF66',
    opacity: 0.7,
  },
  corner: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: '#4CC9F0AA',
  },
  cornerTL: {
    top: 8,
    left: 8,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 8,
    right: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 8,
    left: 8,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 6,
    opacity: 0.7,
  },
  cornerBR: {
    bottom: 8,
    right: 8,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 6,
    opacity: 0.7,
  },
});
