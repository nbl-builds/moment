import { colors, formatPrice } from '@moment/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, ReduceMotion } from 'react-native-reanimated';
import { Icon, Text } from '@/components/ui';
import { BIZ } from '../layout';

/** Lime cart bar (47:1828): clear all, "Total Services", total in PKR with the count, Continue. */
export function CartBar({
  total,
  count,
  currency,
  bottom,
  onClear,
  onContinue,
}: {
  total: number;
  count: number;
  currency: string;
  bottom: number;
  onClear: () => void;
  onContinue: () => void;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(180).reduceMotion(ReduceMotion.System)}
      exiting={FadeOutDown.duration(150).reduceMotion(ReduceMotion.System)}
      style={[styles.bar, { bottom }]}
    >
      <Pressable onPress={onClear} style={styles.trash} accessibilityRole="button" accessibilityLabel="Remove all services" hitSlop={6}>
        <Icon name="trash-red" size={24} />
      </Pressable>
      <View style={styles.text} accessible accessibilityLabel={`Total ${formatPrice(total, { currency })}, ${count} service${count === 1 ? '' : 's'}`}>
        <Text variant="caption11" color="secondary">
          Total Services
        </Text>
        <View style={styles.totalRow}>
          <Text variant="body18" weight="semibold" color="secondary" numberOfLines={1} style={styles.total}>
            {formatPrice(total, { currency })}
          </Text>
          <Text variant="body15" color="secondary">
            ({count} Service{count === 1 ? '' : 's'})
          </Text>
        </View>
      </View>
      <Pressable onPress={onContinue} style={({ pressed }) => [styles.continue, pressed && styles.pressed]} accessibilityRole="button">
        <Text variant="subText16" weight="medium" color="white">
          Continue
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: BIZ.inset,
    right: BIZ.inset,
    height: BIZ.cart.height,
    borderRadius: BIZ.cart.radius,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  trash: {
    width: BIZ.cart.trash,
    height: BIZ.cart.trash,
    borderRadius: BIZ.cart.trash / 2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 4,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  total: {
    flexShrink: 1,
  },
  continue: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.secondary,
  },
  pressed: {
    opacity: 0.85,
  },
});
