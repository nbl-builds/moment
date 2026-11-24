import { colors, passwordSchema, spacing } from '@moment/shared';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { showToast } from '@/components/toast';
import { Button, Spinner, Text } from '@/components/ui';
import { setPassword } from '@/features/auth/email-flow';
import { PasswordScreen } from '@/features/auth/password-screen';
import { resetTo, routeAfterSignIn } from '@/features/auth/sign-in-flow';
import { api } from '@/lib/api';

type LinkState = 'checking' | 'ready' | 'invalid';

/**
 * "Set new password", opened by the link in the reset email
 * (moment://reset-password?code=...). Same layout as Enter Password (Figma 12:979).
 */
export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const [state, setState] = useState<LinkState>('checking');
  const exchanged = useRef(false);

  useEffect(() => {
    // The code works once; don't spend it twice if the effect re-runs.
    if (exchanged.current) return;
    exchanged.current = true;
    (async () => {
      if (!params.code) return setState('invalid');
      try {
        await api.auth.exchangeCodeForSession(params.code);
        setState('ready');
      } catch {
        setState('invalid');
      }
    })();
  }, [params.code]);

  const onSubmit = async (password: string) => {
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) return parsed.error.issues[0]?.message;
    await setPassword(parsed.data);
    showToast('Password updated');
    resetTo(await routeAfterSignIn());
  };

  if (state === 'checking') {
    return (
      <View style={styles.center}>
        <Spinner color="secondary" />
      </View>
    );
  }

  if (state === 'invalid') {
    return (
      <View style={styles.center}>
        <Text variant="h3" color="secondary" align="center">
          This link has expired
        </Text>
        <Text variant="body15" weight="medium" color="secondaryTint2" align="center" style={styles.body}>
          Reset links work once and expire after an hour. Ask for a new one from the sign-in screen.
        </Text>
        <Button label="Back to Login" onPress={() => resetTo('/sign-in-email')} style={styles.button} />
      </View>
    );
  }

  return (
    <PasswordScreen
      kind="new"
      title="Set new password"
      label="New password*"
      placeholder="Enter a new password"
      helperText="At least 8 characters, with letters and numbers."
      buttonLabel="Save password"
      onSubmit={onSubmit}
      onBack={() => resetTo('/sign-in-email')}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg + spacing.xs, // 20, the screen inset
    backgroundColor: colors.background,
  },
  body: {
    marginTop: spacing.sm,
  },
  button: {
    marginTop: spacing.xxl,
  },
});
