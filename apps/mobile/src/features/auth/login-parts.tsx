import { colors, spacing } from '@moment/shared';
import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Button, Text } from '@/components/ui';

// Pieces shared by the "Login or sign up" sheet (Figma 1825:2658) and the
// "Sign in with email" screen (12:845). Gaps are the same in both frames.
const GAP = {
  logoToTitle: 11,
  titleToSubtitle: 2,
  dividerToSocial: 32,
  socialButtons: 10,
} as const;

/** The 151 x 136 mark at 70pt wide. */
const LOGO = { width: 70, height: 63 } as const;
const TERMS_MAX_WIDTH = 387;

/** Logo, "Login or sign up" and the subtitle. */
export function LoginHeader() {
  return (
    <>
      <Image source={require('../../../assets/logo.svg')} style={styles.logo} contentFit="contain" accessibilityLabel="Moment" />
      <Text variant="h3" color="secondary" style={styles.title}>
        Login or sign up
      </Text>
      <Text variant="body15" weight="medium" color="secondaryTint2" style={styles.subtitle}>
        Get a Moment account and discover unforgettable experiences
      </Text>
    </>
  );
}

/** Thin rule with "or" in the middle. */
export function OrDivider({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.divider, style]} accessible={false}>
      <View style={styles.dividerLine} />
      <Text variant="subText12" weight="bold" color="secondary">
        or
      </Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

interface SocialButtonsProps {
  /** The first row: switch to email (on the phone sheet) or to number (on the email screen). */
  switchTo: 'email' | 'number';
  onSwitch: () => void;
  onApple: () => void;
  onGoogle: () => void;
  /** Shown on the email screen only, as in Figma. */
  onFacebook?: () => void;
}

/** "Continue with ..." rows below the divider. */
export function SocialButtons({ switchTo, onSwitch, onApple, onGoogle, onFacebook }: SocialButtonsProps) {
  return (
    <View style={styles.socialList}>
      <Button
        variant="soft"
        icon={switchTo === 'email' ? 'mail' : 'mobile'}
        iconPlacement="start"
        iconUntinted
        label={switchTo === 'email' ? 'Continue with email' : 'Continue with number'}
        onPress={onSwitch}
      />
      <Button variant="soft" icon="apple" iconPlacement="start" iconUntinted label="Continue with apple" onPress={onApple} />
      <Button variant="soft" icon="google" iconPlacement="start" iconUntinted label="Continue with google" onPress={onGoogle} />
      {onFacebook && (
        <Button
          variant="soft"
          icon="facebook"
          iconPlacement="start"
          iconUntinted
          label="Continue with facebook"
          onPress={onFacebook}
        />
      )}
    </View>
  );
}

interface TermsNoteProps {
  /** The sheet underlines the two document names; the email screen shows plain text. */
  linked?: boolean;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** "By tapping continue ... Terms of Service, and Privacy Policy." */
export function TermsNote({ linked = false, onOpenTerms, onOpenPrivacy, style }: TermsNoteProps) {
  const link = (label: string, onPress?: () => void) =>
    linked ? (
      <Text variant="body12" weight="medium" color="black" style={styles.link} onPress={onPress} accessibilityRole="link">
        {label}
      </Text>
    ) : (
      label
    );

  return (
    <Text variant="body12" color="black" align="center" style={[styles.terms, style]}>
      By tapping continue with Email, Phone number, Apple, Facebook or Google, you agree to Moment{' '}
      {link('Terms of Service', onOpenTerms)}, and {link('Privacy Policy', onOpenPrivacy)}.
    </Text>
  );
}

export const loginGaps = GAP;

const styles = StyleSheet.create({
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
  divider: {
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
  terms: {
    maxWidth: TERMS_MAX_WIDTH,
    alignSelf: 'center',
  },
  link: {
    textDecorationLine: 'underline',
  },
});
