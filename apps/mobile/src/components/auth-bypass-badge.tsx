import { colors, radii, spacing } from '@moment/shared';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AUTH_BYPASS } from '@/lib/auth-bypass';
import { Text } from './ui';

/**
 * Small "Auth bypass" pill, shown on every screen while the dev auth bypass is
 * on. It sits beside the home indicator, where no screen has content, and
 * ignores touches.
 */
export function AuthBypassBadge() {
  const insets = useSafeAreaInsets();
  if (!AUTH_BYPASS) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.badge, { bottom: Math.max(insets.bottom - 26, spacing.xs) }]}
      accessibilityLabel="Auth bypass is on"
    >
      <Text variant="body10" weight="bold" color="onThird">
        Auth bypass
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    left: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: colors.third,
    zIndex: 1000,
    elevation: 1000,
  },
});
