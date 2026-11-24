import { colors, spacing } from '@moment/shared';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text } from '@/components/ui';
import { useLoginSheet } from '@/features/auth/login-sheet-provider';
import { resetTo } from '@/features/auth/sign-in-flow';
import { OnboardingPermissions } from '@/features/permissions/onboarding-permissions';
import { api } from '@/lib/api';

/**
 * Placeholder Home until the Customer Dashboard is built. After sign up it
 * shows the location and notification sheets on top (`?permissions=1`).
 * "Skip for now" on the login sheet lands here as a guest (no session).
 */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { permissions } = useLocalSearchParams<{ permissions?: string }>();
  const { openLoginSheet } = useLoginSheet();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    api.auth
      .getSession()
      .then((session) => setSignedIn(Boolean(session)))
      .catch(() => setSignedIn(false));
    const unsubscribe = api.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return unsubscribe;
  }, []);

  // Ask once: drop the flag so a reload does not show the sheets again.
  const onPermissionsFinished = useCallback(() => router.setParams({ permissions: undefined }), []);

  const onSignOut = async () => {
    await api.auth.signOut().catch(() => undefined);
    resetTo('/onboarding');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.center}>
        <Image source={require('../../assets/logo.svg')} style={styles.logo} contentFit="contain" accessible={false} />
        <Text variant="h3" color="secondary" align="center">
          Home
        </Text>
        <Text variant="body15" weight="medium" color="secondaryTint2" align="center">
          The dashboard is coming soon.
        </Text>
      </View>
      {signedIn === true && <Button label="Sign out" variant="soft" onPress={onSignOut} style={styles.signOut} />}
      {signedIn === false && <Button label="Sign in" onPress={() => openLoginSheet()} style={styles.signOut} />}

      {permissions === '1' && <OnboardingPermissions onFinished={onPermissionsFinished} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  logo: {
    width: 70,
    height: 63,
    marginBottom: spacing.lg,
  },
  signOut: {
    marginHorizontal: 20,
  },
});
