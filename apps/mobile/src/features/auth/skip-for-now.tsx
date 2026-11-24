import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/components/ui';

/**
 * Grey "Skip for now" text link under the main button (Figma 7:1032, 20:2897):
 * Body Regular 14 Medium, S Tint 3, centred.
 */
export function SkipForNow({ onPress, style }: { onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      style={({ pressed }) => [styles.link, pressed && styles.pressed, style]}
    >
      <Text variant="body14" weight="medium" color="secondaryTint3">
        Skip for now
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    alignSelf: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
