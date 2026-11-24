import { colors, spacing } from '@moment/shared';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCollapsibleTabBarScroll, useTabBarContentInset } from '@/components/tab-bar';
import { Text } from '@/components/ui';

/** A tab that is not built yet. Scrollable, so the tab bar behaves as everywhere else. */
export function TabPlaceholder({ title, note }: { title: string; note: string }) {
  const insets = useSafeAreaInsets();
  const onScroll = useCollapsibleTabBarScroll();
  const bottomInset = useTabBarContentInset();

  return (
    <Animated.ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: bottomInset }]}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <Text variant="h3" color="secondary">
        {title}
      </Text>
      <Text variant="body15" weight="medium" color="secondaryTint2" style={styles.note}>
        {note}
      </Text>
      <View style={styles.spacer} />
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  content: {
    paddingHorizontal: 20,
  },
  note: {
    marginTop: spacing.xs,
  },
  // Tall enough to scroll, so the tab bar's shrink can be tried on every tab.
  spacer: {
    height: 1200,
  },
});
