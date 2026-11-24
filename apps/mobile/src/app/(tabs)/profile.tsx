import { colors, spacing } from '@moment/shared';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCollapsibleTabBarScroll, useTabBarContentInset } from '@/components/tab-bar';
import { Button, Text } from '@/components/ui';
import { useLoginSheet } from '@/features/auth/login-sheet-provider';
import { resetTo } from '@/features/auth/sign-in-flow';
import { useMyProfile, useSession } from '@/features/auth/use-session';
import { api } from '@/lib/api';

/** Placeholder Profile tab until the Profile screens are built; keeps Sign in / Sign out. */
export default function ProfileTab() {
  const insets = useSafeAreaInsets();
  const onScroll = useCollapsibleTabBarScroll();
  const bottomInset = useTabBarContentInset();
  const session = useSession();
  const { data } = useMyProfile();
  const { openLoginSheet } = useLoginSheet();

  const signOut = async () => {
    await api.auth.signOut().catch(() => undefined);
    resetTo('/onboarding');
  };

  return (
    <Animated.ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: bottomInset }]}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <Text variant="h3" color="secondary">
        {session ? (data?.profile.display_name ?? 'Profile') : 'Profile'}
      </Text>
      <Text variant="body15" weight="medium" color="secondaryTint2" style={styles.note}>
        Your account, wallet, membership and settings come next.
      </Text>
      {session === null && <Button label="Sign in" onPress={() => openLoginSheet()} style={styles.button} />}
      {session && <Button label="Sign out" variant="soft" onPress={signOut} style={styles.button} />}
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
  button: {
    marginTop: spacing.xl,
  },
  spacer: {
    height: 1200,
  },
});
