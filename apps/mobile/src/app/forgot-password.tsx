import { colors, emailSchema, forgotPasswordSchema } from '@moment/shared';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/bottom-sheet';
import { BackButton, Button, Input, Text } from '@/components/ui';
import { sendPasswordResetEmail } from '@/features/auth/email-flow';
import { useCountdown } from '@/hooks/use-countdown';

// Figma: "Forgot Password" (13:1141) and its "Message Sent" sheet (13:1256).
// Measured in the 428 x 926 frame below the 44pt status bar.
const GAP = {
  top: 16, // status bar -> back chevron
  backToArt: 34,
  artToTitle: 36,
  titleToBody: 6,
  bodyToLabel: 41,
  fieldToButton: 28,
} as const;
const SHEET_GAP = {
  /** Sheet top -> thumbs-up; the SVG overhangs its 92.5 x 90 box by 1.25pt. */
  top: 27.75,
  artToTitle: 30.75,
  titleToBody: 2,
  bodyToButton: 27,
  buttonToResend: 17,
  resendAboveSafeArea: 16,
} as const;
const ART = 196;
const SENT_ART = { width: 95, height: 92.5 } as const;
const BODY_WIDTH = 261;
const SHEET_BODY_WIDTH = 270;
const INSET = 20;
const RESEND_COOLDOWN_S = 60;

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { email: initialEmail = '' } = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const cooldown = useCountdown(RESEND_COOLDOWN_S, { startOnMount: false });

  // Send Link stays in its grey disabled style until the email looks right (Figma 13:1254).
  const canSend = emailSchema.safeParse(email).success;

  const send = async (address: string) => {
    await sendPasswordResetEmail(address);
    setSentTo(address);
    cooldown.restart();
  };

  const onSend = async () => {
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid email address');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await send(parsed.data.email);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const onResend = async () => {
    if (!sentTo || cooldown.remaining > 0) return;
    await send(sentTo).catch(() => undefined);
  };

  const onBackToLogin = () => {
    setSentTo(null);
    router.dismissTo('/sign-in-email');
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + GAP.top, paddingBottom: insets.bottom + INSET }]}
          keyboardShouldPersistTaps="handled"
        >
          <BackButton />
          <Image
            source={require('../../assets/illustrations/reset-padlock.svg')}
            style={styles.art}
            contentFit="contain"
            accessible={false}
          />
          <Text variant="h3" color="secondary" align="center" style={styles.title}>
            Reset Password
          </Text>
          <Text variant="body15" weight="medium" color="secondaryTint2" align="center" style={styles.body}>
            Enter your registered email below to receive password reset instructions.
          </Text>

          <Input
            style={styles.field}
            label="Email*"
            accessibilityLabel="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (error) setError(null);
            }}
            onSubmitEditing={onSend}
            error={error}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Button label="Send Link" onPress={onSend} loading={sending} disabled={!canSend} style={styles.button} />
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheet visible={sentTo !== null} onRequestClose={() => setSentTo(null)} accessibilityLabel="Message Sent">
        <View style={[styles.sheet, { paddingBottom: insets.bottom + SHEET_GAP.resendAboveSafeArea }]}>
          <Image
            source={require('../../assets/illustrations/message-sent.svg')}
            style={styles.sentArt}
            contentFit="contain"
            accessible={false}
          />
          <Text variant="h3" color="secondary" align="center" style={styles.sheetTitle}>
            Message Sent
          </Text>
          <Text variant="body16" weight="medium" color="secondaryTint2" align="center" style={styles.sheetBody}>
            Please check your inbox and click on received link to reset password.
          </Text>
          <Button label="Back to Login" onPress={onBackToLogin} style={styles.sheetButton} />
          <Text variant="body16" weight="medium" color="secondaryTint2" align="center" style={styles.resend}>
            Didn’t receive the link?{' '}
            {cooldown.remaining > 0 ? (
              <Text variant="body16" weight="bold" color="secondaryTint3">
                Send again in {cooldown.remaining}s
              </Text>
            ) : (
              <Text
                variant="body16"
                weight="bold"
                color="secondary"
                style={styles.link}
                onPress={onResend}
                accessibilityRole="button"
              >
                Send again
              </Text>
            )}
          </Text>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fill: {
    flex: 1,
  },
  content: {
    paddingHorizontal: INSET,
  },
  art: {
    marginTop: GAP.backToArt,
    width: ART,
    height: ART,
    alignSelf: 'center',
  },
  title: {
    marginTop: GAP.artToTitle,
  },
  body: {
    marginTop: GAP.titleToBody,
    maxWidth: BODY_WIDTH,
    alignSelf: 'center',
  },
  field: {
    marginTop: GAP.bodyToLabel,
  },
  button: {
    marginTop: GAP.fieldToButton,
  },
  sheet: {
    paddingTop: SHEET_GAP.top,
    paddingHorizontal: INSET,
    alignItems: 'center',
  },
  sentArt: {
    width: SENT_ART.width,
    height: SENT_ART.height,
  },
  sheetTitle: {
    marginTop: SHEET_GAP.artToTitle,
  },
  sheetBody: {
    marginTop: SHEET_GAP.titleToBody,
    maxWidth: SHEET_BODY_WIDTH,
  },
  sheetButton: {
    marginTop: SHEET_GAP.bodyToButton,
  },
  resend: {
    marginTop: SHEET_GAP.buttonToResend,
  },
  link: {
    textDecorationLine: 'underline',
  },
});
