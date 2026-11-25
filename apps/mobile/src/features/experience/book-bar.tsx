import { colors } from '@moment/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';

/** Sticky "Book me" bar (48:3873): price per person on the left, white button right. */
export function BookBar({ price, unit, onBook, bottom }: { price: string; unit: string; onBook: () => void; bottom: number }) {
  return (
    <View style={[styles.bar, { bottom }]}>
      <View>
        <Text variant="body12" weight="medium" color="white">
          {unit}
        </Text>
        <Text variant="h4" color="white">
          {price}
        </Text>
      </View>
      <Pressable
        onPress={onBook}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Book me, ${price} ${unit.toLowerCase()}`}
      >
        <Text variant="subText16" weight="medium" color="secondary">
          Book me
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 82,
    borderRadius: 15,
    backgroundColor: colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  button: {
    backgroundColor: colors.white,
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.85,
  },
});
