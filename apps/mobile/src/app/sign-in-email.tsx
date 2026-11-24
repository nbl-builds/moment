import { colors, emailSignInSchema } from '@moment/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input } from '@/components/ui';
import { emailSignInMethod } from '@/features/auth/email-flow';
import { LoginHeader, OrDivider, SocialButtons, TermsNote } from '@/features/auth/login-parts';
import { comingSoon, useLoginSheet } from '@/features/auth/login-sheet-provider';
import { sendCode } from '@/features/auth/otp';
import { resetTo } from '@/features/auth/sign-in-flow';

// Figma: "Sign in with email" (12:845). Measured in the 428 x 926 frame below the 44pt status bar.
const GAP = {
  top: 9, // status bar -> logo
  subtitleToLabel: 31,
  helperToContinue: 50,
  continueToDivider: 32,
  socialToTerms: 31,
} as const;
const INSET = 20;

export default function SignInEmailScreen() {
  const insets = useSafeAreaInsets();
  const { openLoginSheet } = useLoginSheet();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const validate = (value: string) => {
    const result = emailSignInSchema.safeParse({ email: value });
    setError(result.success ? null : (result.error.issues[0]?.message ?? 'Enter a valid email address'));
    return result.success ? result.data.email : null;
  };

  const onContinue = async () => {
    const valid = validate(email);
    if (!valid || busy) return;
    setBusy(true);
    try {
      const method = await emailSignInMethod(valid);
      if (method === 'password') {
        router.push({ pathname: '/enter-password', params: { email: valid } });
      } else {
        await sendCode({ email: valid });
        router.push({
          pathname: '/verify-code',
          params: method === 'new' ? { email: valid, next: 'create-password' } : { email: valid },
        });
      }
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // Back to the phone sheet over the screen underneath (onboarding).
  const onContinueWithNumber = () => {
    if (router.canGoBack()) router.back();
    else resetTo('/onboarding');
    openLoginSheet();
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + GAP.top, paddingBottom: insets.bottom + INSET }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LoginHeader />

        <Input
          style={styles.field}
          label="Email*"
          accessibilityLabel="Email"
          helperText="We will send you the verification code on your email."
          error={error}
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            // Once an error is showing, re-check as they type so it clears as soon as the email is valid.
            if (error) validate(value);
          }}
          onSubmitEditing={onContinue}
          placeholder="Enter your email"
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
        />

        <Button label="Continue" onPress={onContinue} loading={busy} style={styles.continue} />

        <OrDivider style={styles.divider} />

        <SocialButtons
          switchTo="number"
          onSwitch={onContinueWithNumber}
          onApple={comingSoon}
          onGoogle={comingSoon}
          onFacebook={comingSoon}
        />

        <TermsNote style={styles.terms} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: INSET,
  },
  field: {
    marginTop: GAP.subtitleToLabel,
  },
  continue: {
    marginTop: GAP.helperToContinue,
  },
  divider: {
    marginTop: GAP.continueToDivider,
  },
  terms: {
    marginTop: GAP.socialToTerms,
  },
});
