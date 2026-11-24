import { colors, formatPkPhoneInput, inputField, spacing } from '@moment/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, Input, Text } from '@/components/ui';
import { LoginHeader, OrDivider, SocialButtons, TermsNote } from './login-parts';

// Figma: "Sign in / Up with phone Bottom Sheet" (node 1825:2658).
// Vertical gaps are measured between elements in that frame.
const GAP = {
  top: 29, // sheet top -> logo
  subtitleToLabel: 31,
  helperToContinue: 32,
  continueToDivider: 32,
  socialToSkip: 26,
  skipToTerms: 25,
  minBottom: 16, // terms -> bottom edge
} as const;

/** "Skip for now" is a Web-Field chip in Figma (1825:2905), not a Button: 18 / 12 padding, radius 12. */
const SKIP = { paddingHorizontal: 18, paddingVertical: spacing.md, radius: 12 } as const;
/** Horizontal inset of the sheet content. */
const CONTENT_INSET = 20;

export interface LoginSheetContentProps {
  /** Phone number to start with (e.g. after "Edit" on the code screen). National format. */
  initialPhone?: string;
  /**
   * Called with the typed national number. Throw an Error to show its message
   * under the field; the button shows a spinner until it settles.
   */
  onContinueWithPhone: (nationalNumber: string) => Promise<void>;
  onContinueWithEmail: () => void;
  onContinueWithApple: () => void;
  onContinueWithGoogle: () => void;
  onSkip: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
}

/**
 * "Login or sign up" sheet: phone number, Continue, social options, Skip for
 * now and terms. "Continue with email" opens the email screen.
 */
export function LoginSheetContent({
  initialPhone = '',
  onContinueWithPhone,
  onContinueWithEmail,
  onContinueWithApple,
  onContinueWithGoogle,
  onSkip,
  onOpenTerms,
  onOpenPrivacy,
}: LoginSheetContentProps) {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState(initialPhone);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const onContinue = async () => {
    if (sending) return;
    setSending(true);
    setPhoneError(null);
    try {
      await onContinueWithPhone(phone);
    } catch (e) {
      setPhoneError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, GAP.minBottom) }]}>
      <LoginHeader />

      <Input
        style={styles.fieldBlock}
        label="Phone Number"
        helperText="We will call or text you to confirm your number. Standard message and rates apply."
        error={phoneError}
        leading={
          // Pakistan only for now; the chevron is where a country picker will open.
          <View style={styles.countryCode} accessible accessibilityLabel="Country code Pakistan, plus 92">
            <Text variant="subText16" color="secondary">
              +92
            </Text>
            <Icon name="chevron-down" color="secondary" />
          </View>
        }
        value={phone}
        onChangeText={(text) => {
          setPhone(formatPkPhoneInput(text));
          if (phoneError) setPhoneError(null);
        }}
        onSubmitEditing={onContinue}
        placeholder="3XX XXXXXXX"
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        maxLength={11}
      />

      <Button label="Continue" onPress={onContinue} loading={sending} style={styles.continue} />

      <OrDivider style={styles.divider} />

      <SocialButtons
        switchTo="email"
        onSwitch={onContinueWithEmail}
        onApple={onContinueWithApple}
        onGoogle={onContinueWithGoogle}
      />

      <Pressable style={({ pressed }) => [styles.skip, pressed && styles.pressed]} onPress={onSkip} accessibilityRole="button">
        <Text variant="subText16" color="secondary">
          Skip for now
        </Text>
      </Pressable>

      <TermsNote linked onOpenTerms={onOpenTerms} onOpenPrivacy={onOpenPrivacy} style={styles.terms} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: GAP.top,
    paddingHorizontal: CONTENT_INSET,
  },
  fieldBlock: {
    marginTop: GAP.subtitleToLabel,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: inputField.accessoryGap,
  },
  continue: {
    marginTop: GAP.helperToContinue,
  },
  divider: {
    marginTop: GAP.continueToDivider,
  },
  skip: {
    marginTop: GAP.socialToSkip,
    alignSelf: 'center',
    paddingHorizontal: SKIP.paddingHorizontal,
    paddingVertical: SKIP.paddingVertical,
    borderRadius: SKIP.radius,
    backgroundColor: colors.secondaryTint5,
  },
  terms: {
    marginTop: GAP.skipToTerms,
  },
  pressed: {
    opacity: 0.8,
  },
});
