import { ApiError, colors, OTP_LENGTH } from '@moment/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, OtpInput, Text } from '@/components/ui';
import { useLoginSheet } from '@/features/auth/login-sheet-provider';
import { sendCode, verifyCode, type OtpTarget } from '@/features/auth/otp';
import { resetTo, routeAfterSignIn } from '@/features/auth/sign-in-flow';

// Figma: "Sign In OTP" — empty (7:1034), code entered (9:603), wrong code (9:728).
// Vertical positions are measured in the 428 x 926 frame below the 44pt status bar.
const GAP = {
  top: 26, // status bar -> padlock badge
  badgeToTitle: 20,
  titleToSent: 2,
  sentToCells: 29.5,
  cellsToError: 10,
  /** Cells -> "Didn't get a code?" whether or not the error line shows. */
  cellsToResend: 60,
  continueAboveKeyboard: 25,
  continueAboveSafeArea: 16,
} as const;
const INSET = 20;
const BADGE = { padding: 30, radius: 30, icon: 48 } as const;
const DOT = 4;
const RESEND_COOLDOWN_S = 60;

const WRONG_CODE = 'Wrong verification code';

export default function VerifyCodeScreen() {
  const { phone, email } = useLocalSearchParams<{ phone?: string; email?: string }>();
  const target: OtpTarget = email ? { email } : { phone: phone ?? '' };
  const sentTo = email ?? phone ?? '';
  const insets = useSafeAreaInsets();
  const { openLoginSheet } = useLoginSheet();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const keyboardShown = useKeyboardVisible();
  const cooldown = useCountdown(RESEND_COOLDOWN_S);

  const complete = code.length === OTP_LENGTH;

  const onChangeCode = (next: string) => {
    setCode(next);
    if (error) setError(null);
  };

  const onContinue = async () => {
    if (!complete || verifying) return;
    setVerifying(true);
    try {
      await verifyCode(target, code);
      resetTo(await routeAfterSignIn());
    } catch (e) {
      setError(e instanceof ApiError && e.code === 'invalid' ? WRONG_CODE : messageOf(e));
    } finally {
      setVerifying(false);
    }
  };

  const onEdit = () => {
    router.back();
    openLoginSheet(email ? { email } : { phone });
  };

  const onResend = async () => {
    if (cooldown.remaining > 0) return;
    cooldown.restart();
    setCode('');
    setError(null);
    try {
      await sendCode(target);
    } catch (e) {
      setError(messageOf(e));
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.content, { paddingTop: insets.top + GAP.top }]}>
        <View style={styles.badge} accessible={false}>
          <Icon name="padlock" size={BADGE.icon} />
        </View>

        <Text variant="h3" color="secondary" style={styles.title}>
          Enter verification code
        </Text>

        <View style={styles.sentRow}>
          <Text variant="body15" weight="medium" color="secondaryTint2">
            Sent to {sentTo}
          </Text>
          <Pressable
            onPress={onEdit}
            style={styles.edit}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={email ? 'Edit email' : 'Edit phone number'}
          >
            <View style={styles.dot} />
            <Text variant="body15" weight="bold" color="black">
              Edit
            </Text>
          </Pressable>
        </View>

        <View style={styles.cells}>
          <OtpInput value={code} onChangeText={onChangeCode} error={Boolean(error)} />
        </View>

        <View style={styles.belowCells}>
          {error && (
            <Text
              variant="body12"
              color="error"
              style={styles.error}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              {error}
            </Text>
          )}
        </View>

        <Text variant="body16" weight="medium" color="secondaryTint2" align="center">
          Didn’t get a code?{' '}
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

      {complete && (
        <Button
          label="Continue"
          onPress={onContinue}
          loading={verifying}
          style={[
            styles.continue,
            {
              marginBottom: keyboardShown ? GAP.continueAboveKeyboard : insets.bottom + GAP.continueAboveSafeArea,
            },
          ]}
        />
      )}
    </KeyboardAvoidingView>
  );
}

function messageOf(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.';
}

/** Seconds left on a countdown that starts on mount. */
function useCountdown(seconds: number) {
  const [endsAt, setEndsAt] = useState(() => Date.now() + seconds * 1000);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return {
    remaining: Math.max(0, Math.ceil((endsAt - now) / 1000)),
    restart: () => {
      const t = Date.now();
      setNow(t);
      setEndsAt(t + seconds * 1000);
    },
  };
}

/** Whether the keyboard is up, to place Continue 25pt above it as in Figma. */
function useKeyboardVisible(): boolean {
  // Starts hidden: the show event arrives when the autofocused field brings the
  // keyboard up, and never does with a hardware keyboard.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // iOS has "will" events (in step with the animation); Android only "did".
    const [showEvent, hideEvent] =
      Platform.OS === 'ios' ? (['keyboardWillShow', 'keyboardWillHide'] as const) : (['keyboardDidShow', 'keyboardDidHide'] as const);
    const show = Keyboard.addListener(showEvent, () => setVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: INSET,
  },
  badge: {
    alignSelf: 'flex-start',
    padding: BADGE.padding,
    borderRadius: BADGE.radius,
    backgroundColor: colors.primaryTint6,
  },
  title: {
    marginTop: GAP.badgeToTitle,
  },
  sentRow: {
    marginTop: GAP.titleToSent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  edit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.black,
  },
  cells: {
    marginTop: GAP.sentToCells,
  },
  belowCells: {
    height: GAP.cellsToResend,
  },
  error: {
    marginTop: GAP.cellsToError,
  },
  link: {
    textDecorationLine: 'underline',
  },
  continue: {
    marginHorizontal: INSET,
  },
});
