import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Colors } from '../theme/colors';
import { Metrics } from '../theme/metrics';
import { Typography } from '../theme/typography';
import { ThemedText } from './ThemedText';

export type SegmentedOption<T extends string> = {
  key: T;
  label: string;
};

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  scrollable,
  size,
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (v: T) => void;
  scrollable?: boolean;
  size?: 'normal' | 'compact';
}) {
  const compact = size === 'compact';
  const content = (
    <View style={[styles.wrap, compact ? styles.wrapCompact : undefined]}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[
              styles.item,
              compact ? styles.itemCompact : undefined,
              scrollable ? styles.itemScroll : undefined,
              compact && scrollable ? styles.itemScrollCompact : undefined,
              active ? styles.itemActive : undefined,
            ]}
            hitSlop={compact ? 12 : 10}
          >
            <ThemedText
              variant="label"
              style={[
                styles.text,
                compact ? styles.textCompact : undefined,
                active ? styles.textActive : undefined,
              ]}
            >
              {opt.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, compact ? styles.scrollContentCompact : undefined]}
      >
        {content}
      </ScrollView>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#32466F',
    borderRadius: Metrics.radius,
    padding: 6,
  },
  wrapCompact: {
    padding: 0,
    gap: 4,
    borderRadius: 12,
  },
  scrollContent: {
    paddingBottom: 2,
  },
  scrollContentCompact: {
    paddingBottom: 0,
  },
  item: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Metrics.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCompact: {
    height: 35,
    paddingVertical: 0,
    borderRadius: 10,
  },
  itemScroll: {
    flex: 0,
    paddingHorizontal: 14,
  },
  itemScrollCompact: {
    paddingHorizontal: 10,
  },
  itemActive: {
    backgroundColor: '#2A3D66',
    borderWidth: 1,
    borderColor: Colors.accent2,
    shadowColor: Colors.accent2,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  text: {
    fontSize: Typography.sizeXs,
    color: Colors.textMuted,
  },
  textCompact: {
    fontSize: Typography.sizeSm,
    lineHeight: Typography.sizeSm + 2,
  },
  textActive: {
    color: '#DDF5FF',
  },
});
