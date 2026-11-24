import { colors, spacing } from '@moment/shared';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton, Text } from '@/components/ui';

/**
 * Placeholder for a screen that is built next. Keeps navigation from Home
 * working end to end until the real screen replaces the route.
 */
export function ComingNext({ title, note, children }: { title: string; note: string; children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <BackButton />
      <Text variant="h3" color="secondary" style={styles.title}>
        {title}
      </Text>
      <Text variant="body15" weight="medium" color="secondaryTint2" style={styles.note}>
        {note}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: colors.background,
  },
  title: {
    marginTop: spacing.xxl - 2,
  },
  note: {
    marginTop: spacing.xs,
  },
});
