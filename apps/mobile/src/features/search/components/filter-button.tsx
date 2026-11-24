import { colors } from '@moment/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from '@/components/ui';

const BADGE = 16;

/** The filter icon, with the number of active filters in a small lime badge. */
export function FilterButton({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `Filters, ${count} active` : 'Filters'}
    >
      <Icon name="filter" />
      {count > 0 && (
        <View style={styles.badge} accessible={false}>
          <Text variant="body10" weight="bold" color="secondary" align="center">
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -7,
    right: -8,
    minWidth: BADGE,
    height: BADGE,
    paddingHorizontal: 3,
    borderRadius: BADGE / 2,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
