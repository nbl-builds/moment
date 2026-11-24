import { colors } from '@moment/shared';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton, Button, Icon, Input, Text } from '@/components/ui';

// Figma: "Enter Password" (12:979). Also the layout for "Create password" and
// "Set new password". Measured in the 428 x 926 frame below the 44pt status bar.
const GAP = {
  top: 16, // status bar -> back chevron
  backToTitle: 30,
  titleToLabel: 56,
  fieldToForgot: 12,
  forgotToButton: 74.5,
  /** Without the "Forgot Password?" line, the button keeps its Figma position. */
  fieldToButton: 109,
} as const;
const INSET = 20;
const EYE_HIT_SLOP = 10;

export interface PasswordScreenProps {
  title: string;
  label?: string;
  placeholder: string;
  buttonLabel: string;
  /** Rule shown under the field until there is an error, e.g. on Create password. */
  helperText?: string;
  /** Returns an error message to show under the field, or nothing on success. */
  onSubmit: (password: string) => Promise<string | void>;
  /** Shows "Forgot Password?" under the field. */
  onForgot?: () => void;
  onBack?: () => void;
  /** Password managers: 'password' to sign in, 'newPassword' to create one. */
  kind: 'current' | 'new';
  /** Extra content under the button. */
  footer?: ReactNode;
}

export function PasswordScreen({
  title,
  label = 'Password*',
  placeholder,
  buttonLabel,
  helperText,
  onSubmit,
  onForgot,
  onBack,
  kind,
  footer,
}: PasswordScreenProps) {
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const message = await onSubmit(password);
      if (message) setError(message);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + GAP.top, paddingBottom: insets.bottom + INSET }]}
        keyboardShouldPersistTaps="handled"
      >
        <BackButton onPress={onBack} />
        <Text variant="h3" color="secondary" style={styles.title}>
          {title}
        </Text>

        <Input
          style={styles.field}
          label={label}
          placeholder={placeholder}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (error) setError(null);
          }}
          onSubmitEditing={submit}
          error={error}
          helperText={helperText}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={kind === 'new' ? 'new-password' : 'current-password'}
          textContentType={kind === 'new' ? 'newPassword' : 'password'}
          returnKeyType="go"
          trailing={
            <Pressable
              onPress={() => setVisible((v) => !v)}
              hitSlop={EYE_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={visible ? 'Hide password' : 'Show password'}
            >
              <Icon name={visible ? 'eye' : 'eye-disable'} color="secondary" />
            </Pressable>
          }
        />

        {onForgot && (
          <Pressable onPress={onForgot} hitSlop={8} accessibilityRole="button" style={styles.forgot}>
            <Text variant="body15" weight="medium" color="secondaryTint2">
              Forgot Password?
            </Text>
          </Pressable>
        )}

        <Button
          label={buttonLabel}
          onPress={submit}
          loading={busy}
          style={{ marginTop: onForgot ? GAP.forgotToButton : GAP.fieldToButton }}
        />
        {footer}
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
  title: {
    marginTop: GAP.backToTitle,
  },
  field: {
    marginTop: GAP.titleToLabel,
  },
  forgot: {
    alignSelf: 'flex-end',
    marginTop: GAP.fieldToForgot,
  },
});
