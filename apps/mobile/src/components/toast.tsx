import { colors, radii, spacing } from '@moment/shared';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './ui';

// A short message near the bottom of the screen, e.g. "Coming soon" for the
// sign-in providers that are not wired yet. Not in Figma; kept deliberately plain.

const SHOW_MS = 2000;
/** Above the bottom buttons on most screens. */
const OFFSET_ABOVE_SAFE_AREA = 96;

type Listener = (message: string) => void;
const listeners = new Set<Listener>();

/** Shows `message` in the toast host. Safe to call from anywhere. */
export function showToast(message: string): void {
  listeners.forEach((listener) => listener(message));
}

/** Mount once at the root, above everything else. */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  useEffect(() => {
    const listener: Listener = (message) => setToast({ id: Date.now(), message });
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), SHOW_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <Animated.View
      key={toast.id}
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(200)}
      pointerEvents="none"
      style={[styles.toast, { bottom: insets.bottom + OFFSET_ABOVE_SAFE_AREA }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Text variant="body14" weight="medium" color="white" align="center">
        {toast.message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary,
    zIndex: 1001,
    elevation: 1001,
  },
});
