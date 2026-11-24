import { passwordSchema } from '@moment/shared';
import { useLocalSearchParams } from 'expo-router';
import { setPassword } from '@/features/auth/email-flow';
import { PasswordScreen } from '@/features/auth/password-screen';
import { resetTo } from '@/features/auth/sign-in-flow';
import { api } from '@/lib/api';

/**
 * "Create password" for a new email sign-up, after the email code. Same layout
 * as Enter Password (Figma 12:979); not a separate Figma frame.
 */
export default function CreatePasswordScreen() {
  const { email = '' } = useLocalSearchParams<{ email: string }>();

  const onSubmit = async (password: string) => {
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) return parsed.error.issues[0]?.message;
    await setPassword(parsed.data);
    resetTo({ pathname: '/finish-sign-up', params: { email } });
  };

  // Leaving before a password is set signs out, like Finish signing up.
  const onBack = async () => {
    await api.auth.signOut().catch(() => undefined);
    resetTo('/onboarding');
  };

  return (
    <PasswordScreen
      kind="new"
      title="Create password"
      placeholder="Create a password"
      helperText="At least 8 characters, with letters and numbers."
      buttonLabel="Continue"
      onSubmit={onSubmit}
      onBack={onBack}
    />
  );
}
