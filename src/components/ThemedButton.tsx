import { Pressable, StyleSheet, View, type ViewStyle, type PressableProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';
import { Metrics } from '../theme/metrics';
import { Typography } from '../theme/typography';
import { ThemedText } from './ThemedText';

type Variant = 'primary' | 'secondary' | 'danger';

export type ThemedButtonProps = PressableProps & {
  label: string;
  variant?: Variant;
  left?: React.ReactNode;
  containerStyle?: ViewStyle;
};

export function ThemedButton({
  label,
  variant = 'primary',
  left,
  style,
  containerStyle,
  disabled,
  ...props
}: ThemedButtonProps) {
  const overlayColors = overlayByVariant[variant];
  return (
    <Pressable
      {...props}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        stylesByVariant[variant],
        pressed && !disabled ? styles.pressed : undefined,
        disabled ? styles.disabled : undefined,
        style as any,
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={overlayColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.overlay}
      />
      <View pointerEvents="none" style={styles.glowLine} />
      <View style={[styles.content, containerStyle]}>
        {left ? <View style={styles.left}>{left}</View> : null}
        <ThemedText variant="label" style={styles.label}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Metrics.radius,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  pressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.95,
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  left: {
    marginRight: 8,
  },
  label: {
    color: Colors.text,
    fontSize: Typography.sizeMd,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  glowLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: '#8CD8FF88',
  },
  primary: {
    backgroundColor: Colors.accent,
    borderColor: '#9E8AFF',
  },
  secondary: {
    backgroundColor: '#1C2A48',
    borderColor: '#3A548B',
  },
  danger: {
    backgroundColor: Colors.danger,
    borderColor: '#FF8DA0',
  },
});

const stylesByVariant = {
  primary: styles.primary,
  secondary: styles.secondary,
  danger: styles.danger,
} as const;

const overlayByVariant = {
  primary: ['#CDBDFF55', '#4CC9F015'],
  secondary: ['#4CC9F022', '#7C5CFF12'],
  danger: ['#FF9CB033', '#FF4D6D18'],
} as const;
