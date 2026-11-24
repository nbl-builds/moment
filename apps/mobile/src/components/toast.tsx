import { colors, radii, spacing } from '@moment/shared';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './ui';

// A short message near the bottom of the screen, e.g. "Coming soon" for the
// sign-in providers that are not wired yet. Not in Figma; kept deliberately plain.

const SHOW_MS = 2000;
/** Long enough to reach the action. */
const SHOW_WITH_ACTION_MS = 4000;
/** Above the bottom buttons on most screens. */
const OFFSET_ABOVE_SAFE_AREA = 96;

export interface ToastAction {
  label: string;
  onPress: () => void;
}
type Listener = (message: string, action?: ToastAction) => void;
const listeners = new Set<Listener>();

/** Shows `message` in the toast host, with an optional action ("View"). Safe to call from anywhere. */
export function showToast(message: string, action?: ToastAction): void {
  listeners.forEach((listener) => listener(message, action));
}

/** Mount once at the root, above everything else. */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ id: number; message: string; action?: ToastAction } | null>(null);

  useEffect(() => {
    const listener: Listener = (message, action) => setToast({ id: Date.now(), message, action });
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.action ? SHOW_WITH_ACTION_MS : SHOW_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <Animated.View
      key={toast.id}
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(200)}
      pointerEvents={toast.action ? 'box-none' : 'none'}
      style={[styles.toast, toast.action && styles.withAction, { bottom: insets.bottom + OFFSET_ABOVE_SAFE_AREA }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Text variant="body14" weight="medium" color="white" align="center" numberOfLines={1} style={toast.action && styles.message}>
        {toast.message}
      </Text>
      {toast.action && (
        <Pressable
          onPress={() => {
            toast.action?.onPress();
            setToast(null);
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={toast.action.label}
        >
          <Text variant="body14" weight="bold" color="primary">
            {toast.action.label}
          </Text>
        </Pressable>
      )}
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
    maxWidth: '90%',
    zIndex: 1001,
    elevation: 1001,
  },
  withAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  message: {
    flexShrink: 1,
  },
});
