import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Colors } from '../theme/colors';
import { Metrics } from '../theme/metrics';
import { Typography } from '../theme/typography';
import { ThemedText } from './ThemedText';

export type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
  left?: ReactNode;
  right?: ReactNode;
};

export function TextField({ label, error, left, right, style, ...props }: TextFieldProps) {
  return (
    <View style={styles.wrap}>
      {label ? (
        <ThemedText variant="label" style={styles.label}>
          {label}
        </ThemedText>
      ) : null}
      <View style={styles.shell}>
        {left ? <View style={styles.left}>{left}</View> : null}
        <TextInput {...props} placeholderTextColor={Colors.textMuted} style={[styles.input, style]} />
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
      {error ? (
        <ThemedText variant="label" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  label: {
    color: Colors.textMuted,
  },
  shell: {
    backgroundColor: '#101A2EE0',
    borderWidth: 1,
    borderColor: '#355386',
    borderRadius: Metrics.radius,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  left: {
    marginRight: 10,
  },
  right: {
    marginLeft: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    color: Colors.text,
    fontSize: Typography.sizeMd,
  },
  error: {
    color: Colors.danger,
    fontSize: Typography.sizeXs,
  },
});
