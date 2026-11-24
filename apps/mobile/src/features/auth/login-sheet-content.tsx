import { colors, emailSignInSchema, formatPkPhoneInput, inputField, spacing } from '@moment/shared';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, Input, Text } from '@/components/ui';

// Figma: "Sign in / Up with phone Bottom Sheet" (node 1825:2658) and "Sign Up with email" (node 10:1049).
// Vertical gaps are measured between elements in that frame.
const GAP = {
  top: 29, // sheet top -> logo
  logoToTitle: 11,
  titleToSubtitle: 2,
  subtitleToLabel: 31,
  /** Email has no helper text, so Continue sits this far below the field (or its error). */
  fieldToContinue: 32,
  helperToContinue: 32,
  continueToDivider: 32,
  dividerToSocial: 32,
  socialButtons: 10,
  socialToSkip: 26,
  skipToTerms: 25,
  minBottom: 16, // terms -> bottom edge
} as const;

/** Logo is the 151 x 136 mark at 70pt wide. */
const LOGO = { width: 70, height: 63 } as const;
/** "Skip for now" is a Web-Field chip in Figma (1825:2905), not a Button: 18 / 12 padding, radius 12. */
const SKIP = { paddingHorizontal: 18, paddingVertical: spacing.md, radius: 12 } as const;
const TERMS_MAX_WIDTH = 387;
/** Horizontal inset of the sheet content. */
const CONTENT_INSET = 20;

type SignInMethod = 'phone' | 'email';

export interface LoginSheetContentProps {
  /** Phone number to start with (e.g. after "Edit" on the code screen). National format. */
  initialPhone?: string;
  /**
   * Called with the typed national number. Throw an Error to show its message
   * under the field; the button shows a spinner until it settles.
   */
  onContinueWithPhone?: (nationalNumber: string) => Promise<void>;
  /** Called with a valid, normalised (trimmed, lowercased) email. */
  onContinueWithEmail?: (email: string) => void;
  onContinueWithApple?: () => void;
  onContinueWithGoogle?: () => void;
  onSkip?: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
}

/**
 * "Login or sign up": logo, phone or email field, Continue, social options,
 * Skip for now and terms. "Continue with email" / "Continue with number"
 * switches between the two fields. UI only.
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
  const [method, setMethod] = useState<SignInMethod>('phone');
  const [phone, setPhone] = useState(initialPhone);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const validateEmail = (value: string) => {
    const result = emailSignInSchema.safeParse({ email: value });
    setEmailError(result.success ? null : (result.error.issues[0]?.message ?? 'Enter a valid email address'));
    return result.success ? result.data.email : null;
  };

  const onEmailChange = (value: string) => {
    setEmail(value);
    // Once an error is showing, re-check as they type so it clears as soon as the email is valid.
    if (emailError) validateEmail(value);
  };

  const onContinue = async () => {
    if (method === 'phone') {
      if (!onContinueWithPhone || sending) return;
      setSending(true);
      setPhoneError(null);
      try {
        await onContinueWithPhone(phone);
      } catch (e) {
        setPhoneError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      } finally {
        setSending(false);
      }
      return;
    }
    const valid = validateEmail(email);
    if (valid) onContinueWithEmail?.(valid);
  };

  const toggleMethod = () => setMethod((m) => (m === 'phone' ? 'email' : 'phone'));

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, GAP.minBottom) }]}>
      <Image
        source={require('../../../assets/logo.svg')}
        style={styles.logo}
        contentFit="contain"
        accessibilityLabel="Moment"
      />

      <Text variant="h3" color="secondary" style={styles.title}>
        Login or sign up
      </Text>
      <Text variant="body15" weight="medium" color="secondaryTint2" style={styles.subtitle}>
        Get a Moment account and discover unforgettable experiences
      </Text>

      {method === 'phone' ? (
        <Input
          key="phone"
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
      ) : (
        <Input
          key="email"
          style={styles.fieldBlock}
          label="Email*"
          accessibilityLabel="Email"
          error={emailError}
          value={email}
          onChangeText={onEmailChange}
          onSubmitEditing={onContinue}
          placeholder="Enter your email"
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
        />
      )}

      <Button
        label="Continue"
        onPress={onContinue}
        loading={sending}
        style={{ marginTop: method === 'email' ? GAP.fieldToContinue : GAP.helperToContinue }}
      />

      <View style={styles.divider} accessible={false}>
        <View style={styles.dividerLine} />
        <Text variant="subText12" weight="bold" color="secondary">
          or
        </Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.socialList}>
        {method === 'phone' ? (
          <Button
            variant="soft"
            icon="mail"
            iconPlacement="start"
            iconUntinted
            label="Continue with email"
            onPress={toggleMethod}
          />
        ) : (
          <Button
            variant="soft"
            icon="mobile"
            iconPlacement="start"
            iconUntinted
            label="Continue with number"
            onPress={toggleMethod}
          />
        )}
        <Button
          variant="soft"
          icon="apple"
          iconPlacement="start"
          iconUntinted
          label="Continue with apple"
          onPress={onContinueWithApple}
        />
        <Button
          variant="soft"
          icon="google"
          iconPlacement="start"
          iconUntinted
          label="Continue with google"
          onPress={onContinueWithGoogle}
        />
      </View>

      <Pressable
        style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
        onPress={onSkip}
        accessibilityRole="button"
      >
        <Text variant="subText16" color="secondary">
          Skip for now
        </Text>
      </Pressable>

      <Text variant="body12" color="black" align="center" style={styles.terms}>
        By tapping continue with Email, Phone number, Apple, Facebook or Google, you agree to Moment{' '}
        <Text variant="body12" weight="medium" color="black" style={styles.termsLink} onPress={onOpenTerms} accessibilityRole="link">
          Terms of Conditions
        </Text>
        , and{' '}
        <Text variant="body12" weight="medium" color="black" style={styles.termsLink} onPress={onOpenPrivacy} accessibilityRole="link">
          Privacy Policy
        </Text>
        .
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: GAP.top,
    paddingHorizontal: CONTENT_INSET,
  },
  logo: {
    width: LOGO.width,
    height: LOGO.height,
  },
  title: {
    marginTop: GAP.logoToTitle,
  },
  subtitle: {
    marginTop: GAP.titleToSubtitle,
  },
  fieldBlock: {
    marginTop: GAP.subtitleToLabel,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: inputField.accessoryGap,
  },
  divider: {
    marginTop: GAP.continueToDivider,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.secondaryTint5,
  },
  socialList: {
    marginTop: GAP.dividerToSocial,
    gap: GAP.socialButtons,
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
    maxWidth: TERMS_MAX_WIDTH,
    alignSelf: 'center',
  },
  termsLink: {
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.8,
  },
});
