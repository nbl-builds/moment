import { colors } from '@moment/shared';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/ui';
import { BIZ } from '../layout';

export interface FilterChip<T> {
  value: T;
  label: string;
}

/**
 * Category / star filter chips (47:1697, 47:2080): outlined, the selected one
 * filled light grey with a dark border. Scrolls sideways.
 */
export function FilterChips<T extends string | number | null>({
  chips,
  value,
  onChange,
}: {
  chips: FilterChip<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {chips.map((chip) => {
        const selected = chip.value === value;
        return (
          <Pressable
            key={String(chip.value)}
            onPress={() => onChange(chip.value)}
            style={[styles.chip, selected && styles.selected]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={chip.label}
          >
            <Text variant="subText14" weight={selected ? 'medium' : 'regular'} color="secondary">
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: BIZ.inset,
    gap: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BIZ.chip.radius,
    borderWidth: 1,
    borderColor: colors.chipBorder,
  },
  selected: {
    backgroundColor: colors.chipSelected,
    borderColor: colors.secondary,
  },
});
