import { router } from 'expo-router';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Icon } from './icon';

/** Figma: "chevron-left" at 28pt (Finish signing up, 7:949). */
const SIZE = 28;
const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

export interface BackButtonProps {
  /** Defaults to going back in the stack. */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function BackButton({ onPress, style }: BackButtonProps) {
  return (
    <Pressable
      onPress={onPress ?? (() => router.back())}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel="Back"
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
    >
      <Icon name="chevron-left" size={SIZE} color="black" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
  },
  pressed: {
    opacity: 0.6,
  },
});
