import {
  colors,
  emailSignInSchema,
  formatPkPhoneInput,
  fontFamily,
  spacing,
  textStyles,
  type TextStyleToken,
} from '@moment/shared';
import { Image, type ImageProps } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Figma: "Sign in / Up with phone Bottom Sheet" (node 1825:2658) and "Sign Up with email" (node 10:1049).
// Vertical gaps are measured between elements in that frame.
const GAP = {
  top: 29, // sheet top -> logo
  logoToTitle: 11,
  titleToSubtitle: 2,
  subtitleToLabel: 31,
  labelToField: 8,
  fieldToHelper: 10, // also field -> error message
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
const ICON_SIZE = 24;
/** The Google mark is 39.2 x 40, drawn at 24pt tall. */
const GOOGLE_ICON = { width: 23.52, height: 24 } as const;
/** The mobile glyph is 14 x 20 inside a 24pt icon box. */
const MOBILE_ICON = { width: 14, height: 20 } as const;
const CONTROL_HEIGHT = 60;
const RADIUS = { field: 12, social: 10 } as const;
const FIELD_PADDING = 18;
const COUNTRY_CODE_GAP = 9;
const TERMS_MAX_WIDTH = 387;
/** Horizontal inset of the sheet content. */
const CONTENT_INSET = 20;

type SignInMethod = 'phone' | 'email';

export interface LoginSheetContentProps {
  onContinueWithPhone?: (nationalNumber: string) => void;
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
  const [phone, setPhone] = useState('');
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

  const onContinue = () => {
    if (method === 'phone') {
      onContinueWithPhone?.(phone);
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

      <Text style={styles.title} accessibilityRole="header">
        Login or sign up
      </Text>
      <Text style={styles.subtitle}>Get a Moment account and discover unforgettable experiences</Text>

      {method === 'phone' ? (
        <>
          <Text style={styles.label} nativeID="login-phone-label">
            Phone Number
          </Text>
          <View style={styles.field}>
            {/* Pakistan only for now; the chevron is where a country picker will open. */}
            <View style={styles.countryCode} accessible accessibilityLabel="Country code Pakistan, plus 92">
              <Text style={styles.fieldText}>+92</Text>
              <Image source={require('../../../assets/icon-chevron-down.svg')} style={styles.icon} />
            </View>
            <TextInput
              style={[styles.fieldText, styles.input]}
              value={phone}
              onChangeText={(text) => setPhone(formatPkPhoneInput(text))}
              placeholder="3XX XXXXXXX"
              placeholderTextColor={colors.secondaryTint3}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              maxLength={11}
              accessibilityLabelledBy="login-phone-label"
              accessibilityLabel="Phone Number"
            />
          </View>
          <Text style={styles.helper}>
            We will call or text you to confirm your number. Standard message and rates apply.
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.label} nativeID="login-email-label">
            Email*
          </Text>
          <View style={styles.field}>
            <TextInput
              style={[styles.fieldText, styles.input]}
              value={email}
              onChangeText={onEmailChange}
              onSubmitEditing={onContinue}
              placeholder="Enter your email"
              placeholderTextColor={colors.secondaryTint3}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              accessibilityLabelledBy="login-email-label"
              accessibilityLabel="Email"
              accessibilityHint={emailError ?? undefined}
            />
          </View>
          {emailError && (
            <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
              {emailError}
            </Text>
          )}
        </>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.continue,
          method === 'email' && styles.continueAfterField,
          pressed && styles.pressed,
        ]}
        onPress={onContinue}
        accessibilityRole="button"
      >
        <Text style={styles.continueText}>Continue</Text>
      </Pressable>

      <View style={styles.divider} accessible={false}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.socialList}>
        {method === 'phone' ? (
          <SocialButton
            icon={require('../../../assets/icon-mail.svg')}
            label="Continue with email"
            onPress={toggleMethod}
          />
        ) : (
          <SocialButton
            icon={require('../../../assets/icon-mobile.svg')}
            iconSize={MOBILE_ICON}
            label="Continue with number"
            onPress={toggleMethod}
          />
        )}
        <SocialButton
          icon={require('../../../assets/icon-apple.svg')}
          label="Continue with apple"
          onPress={onContinueWithApple}
        />
        <SocialButton
          icon={require('../../../assets/icon-google.svg')}
          iconSize={GOOGLE_ICON}
          label="Continue with google"
          onPress={onContinueWithGoogle}
        />
      </View>

      <Pressable
        style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
        onPress={onSkip}
        accessibilityRole="button"
      >
        <Text style={styles.skipText}>Skip for now</Text>
      </Pressable>

      <Text style={styles.terms}>
        By tapping continue with Email, Phone number, Apple, Facebook or Google, you agree to Moment{' '}
        <Text style={styles.termsLink} onPress={onOpenTerms} accessibilityRole="link">
          Terms of Conditions
        </Text>
        , and{' '}
        <Text style={styles.termsLink} onPress={onOpenPrivacy} accessibilityRole="link">
          Privacy Policy
        </Text>
        .
      </Text>
    </View>
  );
}

interface SocialButtonProps {
  icon: ImageProps['source'];
  iconSize?: { width: number; height: number };
  label: string;
  onPress?: () => void;
}

function SocialButton({ icon, iconSize, label, onPress }: SocialButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.social, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.socialIcon}>
        <Image source={icon} style={iconSize ?? styles.icon} contentFit="contain" />
      </View>
      <Text style={styles.socialText}>{label}</Text>
    </Pressable>
  );
}

const text = (token: TextStyleToken, family: string, color: string) => ({
  fontFamily: family,
  fontSize: textStyles[token].fontSize,
  lineHeight: textStyles[token].fontSize * textStyles[token].lineHeight,
  letterSpacing: textStyles[token].letterSpacing,
  color,
});

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
    ...text('h3', fontFamily.bold, colors.secondary),
    marginTop: GAP.logoToTitle,
  },
  subtitle: {
    ...text('body15', fontFamily.medium, colors.secondaryTint2),
    marginTop: GAP.titleToSubtitle,
  },
  label: {
    ...text('body14', fontFamily.medium, colors.secondary),
    marginTop: GAP.subtitleToLabel,
  },
  field: {
    marginTop: GAP.labelToField,
    height: CONTROL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: COUNTRY_CODE_GAP,
    paddingHorizontal: FIELD_PADDING,
    borderRadius: RADIUS.field,
    backgroundColor: colors.secondaryTint6,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: COUNTRY_CODE_GAP,
  },
  fieldText: {
    ...text('subText16', fontFamily.regular, colors.secondary),
  },
  input: {
    flex: 1,
    height: CONTROL_HEIGHT,
    // TextInput adds its own line box; a fixed lineHeight shifts the text on iOS.
    lineHeight: undefined,
    paddingVertical: 0,
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  helper: {
    ...text('body12', fontFamily.regular, colors.secondaryTint2),
    marginTop: GAP.fieldToHelper,
  },
  error: {
    ...text('body12', fontFamily.regular, colors.error),
    marginTop: GAP.fieldToHelper,
  },
  continue: {
    marginTop: GAP.helperToContinue,
    height: CONTROL_HEIGHT,
    borderRadius: RADIUS.field,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueAfterField: {
    marginTop: GAP.fieldToContinue,
  },
  continueText: {
    ...text('body16', fontFamily.bold, colors.onPrimary),
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
  dividerText: {
    ...text('subText12', fontFamily.bold, colors.secondary),
  },
  socialList: {
    marginTop: GAP.dividerToSocial,
    gap: GAP.socialButtons,
  },
  social: {
    height: CONTROL_HEIGHT,
    borderRadius: RADIUS.social,
    backgroundColor: colors.secondaryTint6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIcon: {
    position: 'absolute',
    left: FIELD_PADDING,
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialText: {
    ...text('body16', fontFamily.medium, colors.secondary),
  },
  skip: {
    marginTop: GAP.socialToSkip,
    alignSelf: 'center',
    paddingHorizontal: FIELD_PADDING,
    paddingVertical: spacing.md,
    borderRadius: RADIUS.field,
    backgroundColor: colors.secondaryTint5,
  },
  skipText: {
    ...text('subText16', fontFamily.regular, colors.secondary),
  },
  terms: {
    ...text('body12', fontFamily.regular, colors.black),
    marginTop: GAP.skipToTerms,
    maxWidth: TERMS_MAX_WIDTH,
    alignSelf: 'center',
    textAlign: 'center',
  },
  termsLink: {
    fontFamily: fontFamily.medium,
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.8,
  },
});
