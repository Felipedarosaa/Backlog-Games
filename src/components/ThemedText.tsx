import { Text, type TextProps, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';

type Variant = 'title' | 'subtitle' | 'body' | 'muted' | 'label';

export type ThemedTextProps = TextProps & {
  variant?: Variant;
};

export function ThemedText({ variant = 'body', style, ...props }: ThemedTextProps) {
  return <Text {...props} style={[styles.base, stylesByVariant[variant], style]} />;
}

const styles = StyleSheet.create({
  base: {
    color: Colors.text,
    fontSize: Typography.sizeMd,
    fontFamily: Typography.fontBody,
  },
  title: {
    fontSize: Typography.sizeXl,
    fontFamily: Typography.fontHeading,
  },
  subtitle: {
    fontSize: Typography.sizeLg,
    fontFamily: Typography.fontHeading,
  },
  body: {
    fontSize: Typography.sizeMd,
    fontFamily: Typography.fontBody,
  },
  muted: {
    color: Colors.textMuted,
    fontSize: Typography.sizeSm,
    fontFamily: Typography.fontBody,
  },
  label: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: Typography.sizeSm,
  },
});

const stylesByVariant = {
  title: styles.title,
  subtitle: styles.subtitle,
  body: styles.body,
  muted: styles.muted,
  label: styles.label,
} as const;
