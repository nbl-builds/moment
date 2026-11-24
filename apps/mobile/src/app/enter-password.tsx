import { ApiError, passwordSignInSchema } from '@moment/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { signInWithPassword } from '@/features/auth/email-flow';
import { PasswordScreen } from '@/features/auth/password-screen';
import { resetTo, routeAfterSignIn } from '@/features/auth/sign-in-flow';

/** Figma: "Enter Password" (12:979), for an email that already has a password. */
export default function EnterPasswordScreen() {
  const { email = '' } = useLocalSearchParams<{ email: string }>();

  const onSubmit = async (password: string) => {
    const parsed = passwordSignInSchema.safeParse({ email, password });
    if (!parsed.success) return parsed.error.issues[0]?.message;
    try {
      await signInWithPassword(parsed.data.email, parsed.data.password);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'invalid') return 'Incorrect password. Try again or reset it.';
      throw e;
    }
    resetTo(await routeAfterSignIn());
  };

  return (
    <PasswordScreen
      kind="current"
      title="Enter Password"
      placeholder="Enter your password"
      buttonLabel="Agree & Continue"
      onSubmit={onSubmit}
      onForgot={() => router.push({ pathname: '/forgot-password', params: { email } })}
    />
  );
}
